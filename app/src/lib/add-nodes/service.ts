import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createNodeMetadataObjectSchema } from "~/lib/projects/node-metadata.zod";
import {
  createDefaultProjectNodeMetadataSchema,
  sanitizeNodeMetadata,
} from "~/lib/projects/node-metadata";
import { getAddNodesRunSnapshot, getAddNodesRunState, patchAddNodesRun, registerAddNodesRun } from "./run-registry";
import { buildFollowUpPrompt, buildNodeGenerationPrompt, buildQuestionPrompt } from "./prompts";
import {
  completeLlmSession,
  failLlmSession,
  recordLlmSessionEvent,
  startLlmSession,
  withLlmCallLogging,
} from "~/lib/llm-logging/logger.server";
import type {
  AddNodesRunAnswerRequest,
  AddNodesRunEvent,
  AddNodesRunSnapshot,
  AddNodesRunStartRequest,
  AddNodesRunStep,
  AddNodesRunStepId,
  ClarifyingQuestion,
  FollowUpSuggestion,
  GeneratedNodeBatch,
} from "./types";
import {
  appendGeneratedNodesToProjectOnDisk,
} from "~/lib/projects/data.server";
import { readProjectByIdFromDisk } from "~/lib/projects/data.server";

const questionSetSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().min(1),
      prompt: z.string().min(1),
      helperText: z.string().min(1),
      options: z
        .array(
          z.object({
            id: z.string().min(1),
            label: z.string().min(1),
            detail: z.string().min(1),
          }),
        )
        .min(3)
        .max(4),
    }),
  )
    .min(3)
    .max(4),
});

const generatedLinkSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  parentChild: z.boolean(),
  relationship: z.enum(["related", "dependency", "reuse"]).optional(),
});

const followUpSchema = z.object({
  suggestions: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        brief: z.string().min(1),
        guidance: z.string().min(1),
      }),
    )
    .length(4),
});

const addNodesRunStepOrder: AddNodesRunStepId[] = [
  "capture-context",
  "generate-questions",
  "await-answers",
  "generate-nodes",
  "persist-graph",
  "suggest-follow-ups",
  "complete",
];

const addNodesRunStepLabels: Record<AddNodesRunStepId, string> = {
  "capture-context": "Capture context",
  "generate-questions": "Generate questions",
  "await-answers": "Await answers",
  "generate-nodes": "Generate nodes",
  "persist-graph": "Persist graph",
  "suggest-follow-ups": "Suggest follow-ups",
  complete: "Complete",
};

const ADD_NODES_LLM_PIPELINE = "add-nodes";

function getDefaultModel() {
  return process.env.OPENAI_MODEL ?? "gpt-5-mini";
}

function getHeavyModel() {
  return process.env.OPENAI_HEAVY_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4";
}

function assertOpenAiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createInitialSteps(): AddNodesRunStep[] {
  return addNodesRunStepOrder.map((id) => ({
    id,
    label: addNodesRunStepLabels[id],
    status: "pending",
    detail:
      id === "await-answers"
        ? "Waiting for clarification choices."
        : `${addNodesRunStepLabels[id]} has not started.`,
  }));
}

function createInitialSnapshot(args: {
  runId: string;
  projectId: string;
  brief: string;
  selectedNodeId: string | null;
}): AddNodesRunSnapshot {
  return {
    runId: args.runId,
    projectId: args.projectId,
    status: "queued",
    steps: createInitialSteps(),
    currentStepId: "capture-context",
    latestMessage: "Initializing add-nodes run.",
    brief: args.brief,
    selectedNodeId: args.selectedNodeId,
    startedAt: nowIso(),
    elapsedMs: 0,
    questions: [],
    answers: {},
  };
}

function touchSnapshot(snapshot: AddNodesRunSnapshot) {
  snapshot.elapsedMs = Math.max(0, Date.now() - Date.parse(snapshot.startedAt));
}

function activateStep(snapshot: AddNodesRunSnapshot, stepId: AddNodesRunStepId, detail: string) {
  touchSnapshot(snapshot);
  snapshot.status = stepId === "await-answers" ? "awaiting-input" : "running";
  snapshot.currentStepId = stepId;
  snapshot.latestMessage = detail;

  for (const step of snapshot.steps) {
    if (step.id === stepId) {
      step.status = "active";
      step.detail = detail;
      step.startedAt ??= nowIso();
      continue;
    }

    const stepIndex = addNodesRunStepOrder.indexOf(step.id);
    const activeIndex = addNodesRunStepOrder.indexOf(stepId);
    if (stepIndex > activeIndex && step.status === "pending") {
      step.detail = `${addNodesRunStepLabels[step.id]} has not started.`;
    }
  }
}

function completeStep(snapshot: AddNodesRunSnapshot, stepId: AddNodesRunStepId, detail: string) {
  touchSnapshot(snapshot);
  const step = snapshot.steps.find((entry) => entry.id === stepId);
  if (!step) return;
  step.status = "completed";
  step.detail = detail;
  step.startedAt ??= nowIso();
  step.completedAt = nowIso();
  snapshot.latestMessage = detail;
}

function failSnapshot(snapshot: AddNodesRunSnapshot, message: string) {
  touchSnapshot(snapshot);
  snapshot.status = "failed";
  snapshot.error = message;
  snapshot.latestMessage = message;
  snapshot.completedAt = nowIso();
  if (snapshot.currentStepId) {
    const step = snapshot.steps.find((entry) => entry.id === snapshot.currentStepId);
    if (step) {
      step.status = "failed";
      step.detail = message;
      step.startedAt ??= nowIso();
      step.completedAt = nowIso();
    }
  }
}

function completeSnapshot(snapshot: AddNodesRunSnapshot, message: string) {
  touchSnapshot(snapshot);
  snapshot.status = "completed";
  snapshot.currentStepId = "complete";
  snapshot.latestMessage = message;
  snapshot.completedAt = nowIso();
  completeStep(snapshot, "complete", message);
}

function getOptionLabel(question: ClarifyingQuestion, optionId: string) {
  return question.options.find((option) => option.id === optionId)?.label ?? optionId;
}

async function runStructuredPrompt<T>(args: {
  sessionId: string;
  callId: string;
  callLabel: string;
  modelId: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  reasoningEffort?: "minimal" | "low" | "medium";
}) {
  assertOpenAiKey();
  const result = await withLlmCallLogging(
    ADD_NODES_LLM_PIPELINE,
    args.sessionId,
    {
      callId: args.callId,
      label: args.callLabel,
      request: {
        provider: "openai",
        modelId: args.modelId,
        prompt: args.prompt,
        schemaName: args.schemaName,
        maxRetries: 1,
        reasoningEffort: args.reasoningEffort ?? null,
      },
    },
    () =>
      generateText({
        model: openai(args.modelId),
        prompt: args.prompt,
        maxRetries: 1,
        experimental_output: Output.object({ schema: args.schema }),
        providerOptions: args.reasoningEffort
          ? { openai: { reasoningEffort: args.reasoningEffort } }
          : undefined,
      }),
    (value) => ({
      response: {
        output: value.experimental_output,
        finishReason: value.finishReason,
        usage: value.usage,
        warnings: value.warnings,
        providerMetadata: value.providerMetadata,
      },
    }),
  );

  return result.experimental_output;
}

function sanitizeQuestions(questions: ClarifyingQuestion[]) {
  return questions.map((question, questionIndex) => ({
    ...question,
    id: question.id || `question-${questionIndex + 1}`,
    options: question.options.map((option, optionIndex) => ({
      ...option,
      id: option.id || `option-${questionIndex + 1}-${optionIndex + 1}`,
    })),
  }));
}

function sanitizeSuggestions(suggestions: FollowUpSuggestion[]) {
  return suggestions.map((suggestion, index) => ({
    ...suggestion,
    id: suggestion.id || `follow-up-${index + 1}`,
  }));
}

function createGeneratedNodeBatchSchema(
  nodeMetadataSchema: NonNullable<Awaited<ReturnType<typeof readProjectByIdFromDisk>>>["nodeMetadataSchema"],
) {
  return z.object({
    summary: z.string().min(1),
    nodes: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          type: z.string().min(1),
          depth: z.number().int().min(0),
          metadata: createNodeMetadataObjectSchema(nodeMetadataSchema),
          context: z.string().default(""),
        }),
      )
      .min(1)
      .max(10),
    links: z.array(generatedLinkSchema),
  });
}

function sanitizeGeneratedBatch(
  batch: ReturnType<typeof createGeneratedNodeBatchSchema>["_output"],
  nodeMetadataSchema = createDefaultProjectNodeMetadataSchema(),
): GeneratedNodeBatch {
  return {
    ...batch,
    nodes: batch.nodes.map((node) => ({
      ...node,
      metadata: sanitizeNodeMetadata(node.metadata, nodeMetadataSchema, {
        omitDefaultValues: true,
      }),
      rawContext: "",
      contextMode: "structured" as const,
    })),
    links: batch.links.map((link) =>
      link.parentChild
        ? {
            source: link.source,
            target: link.target,
            parentChild: true,
          }
        : {
            source: link.source,
            target: link.target,
            parentChild: false,
            relationship: link.relationship ?? "related",
          },
    ),
  };
}

export function parseQuestionSet(input: unknown) {
  return questionSetSchema.parse(input);
}

export function parseGeneratedNodeBatch(input: unknown) {
  const nodeMetadataSchema = createDefaultProjectNodeMetadataSchema();
  return sanitizeGeneratedBatch(
    createGeneratedNodeBatchSchema(nodeMetadataSchema).parse(input),
    nodeMetadataSchema,
  );
}

export function parseFollowUpSuggestions(input: unknown) {
  return followUpSchema.parse(input);
}

export async function startAddNodesRun(args: {
  projectId: string;
  input: AddNodesRunStartRequest;
}) {
  const project = await readProjectByIdFromDisk(args.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const brief = args.input.brief.trim();
  if (!brief) {
    throw new Error("A short brief is required to start the add-nodes flow.");
  }

  const selectedNode = args.input.selectedNodeId
    ? project.spatialMap.nodes.find((node) => node.id === args.input.selectedNodeId) ?? null
    : null;
  const runId = `add-nodes-${crypto.randomUUID()}`;
  const snapshot = createInitialSnapshot({
    runId,
    projectId: project.id,
    brief,
    selectedNodeId: selectedNode?.id ?? null,
  });

  registerAddNodesRun(snapshot, {
    project,
    selectedNode,
    questions: [],
    answers: {},
  });

  await startLlmSession(ADD_NODES_LLM_PIPELINE, runId, {
    startedAt: snapshot.startedAt,
    metadata: {
      projectId: project.id,
      selectedNodeId: selectedNode?.id ?? null,
      brief,
    },
  });
  await recordLlmSessionEvent(ADD_NODES_LLM_PIPELINE, runId, {
    stage: "run-created",
    message: "Created add-nodes LLM session.",
  });

  void runQuestionPhase(runId);

  return {
    runId,
    snapshot,
  };
}

async function runQuestionPhase(runId: string) {
  try {
    await recordLlmSessionEvent(ADD_NODES_LLM_PIPELINE, runId, {
      stage: "capture-context",
      message: "Captured project graph context for question generation.",
    });
    patchAddNodesRun(runId, (run) => {
      activateStep(run.snapshot, "capture-context", "Inspecting project graph and selected context.");
    });
    patchAddNodesRun(runId, (run) => {
      completeStep(run.snapshot, "capture-context", "Project graph context captured.");
      activateStep(run.snapshot, "generate-questions", "Drafting clarifying questions.");
    });

    const state = getAddNodesRunState(runId);
    const snapshot = getAddNodesRunSnapshot(runId);
    if (!state || !snapshot) {
      throw new Error("Add-nodes run is no longer available.");
    }

    const questionResult = await runStructuredPrompt({
      sessionId: runId,
      callId: "generate-questions",
      callLabel: "Generate clarifying questions",
      modelId: getDefaultModel(),
      prompt: buildQuestionPrompt({
        project: state.project,
        selectedNode: state.selectedNode,
        brief: snapshot.brief,
      }),
      schema: questionSetSchema,
      schemaName: "questionSetSchema",
      reasoningEffort: "minimal",
    });

    const questions = sanitizeQuestions(questionResult.questions);

    patchAddNodesRun(runId, (run) => {
      run.state.questions = questions;
      run.snapshot.questions = questions;
      completeStep(run.snapshot, "generate-questions", `Prepared ${questions.length} clarifying questions.`);
      activateStep(run.snapshot, "await-answers", "Choose one answer for each question to generate nodes.");
    });
    await recordLlmSessionEvent(ADD_NODES_LLM_PIPELINE, runId, {
      stage: "questions-generated",
      message: `Prepared ${questions.length} clarifying questions.`,
      data: { questions },
    });
  } catch (error) {
    await failLlmSession(ADD_NODES_LLM_PIPELINE, runId, error);
    patchAddNodesRun(runId, (run) => {
      failSnapshot(
        run.snapshot,
        error instanceof Error ? error.message : "Failed to prepare clarifying questions.",
      );
    });
  }
}

export async function submitAddNodesRunAnswers(args: {
  projectId: string;
  runId: string;
  input: AddNodesRunAnswerRequest;
}) {
  const snapshot = getAddNodesRunSnapshot(args.runId);
  const state = getAddNodesRunState(args.runId);

  if (!snapshot || !state || snapshot.projectId !== args.projectId) {
    throw new Error("Run not found.");
  }
  if (snapshot.status !== "awaiting-input") {
    throw new Error("This run is not waiting for answers.");
  }

  for (const question of state.questions) {
    const selectedOptionId = args.input.answers[question.id];
    if (!selectedOptionId) {
      throw new Error(`Missing answer for "${question.prompt}".`);
    }
    if (!question.options.some((option) => option.id === selectedOptionId)) {
      throw new Error(`Invalid answer for "${question.prompt}".`);
    }
  }

  patchAddNodesRun(args.runId, (run) => {
    run.state.answers = { ...args.input.answers };
    run.snapshot.answers = { ...args.input.answers };
    completeStep(
      run.snapshot,
      "await-answers",
      `Captured ${Object.keys(args.input.answers).length} clarifying answers.`,
    );
    activateStep(run.snapshot, "generate-nodes", "Generating graph additions from the selected answers.");
  });
  await recordLlmSessionEvent(ADD_NODES_LLM_PIPELINE, args.runId, {
    stage: "answers-submitted",
    message: `Captured ${Object.keys(args.input.answers).length} clarifying answers.`,
    data: { answers: args.input.answers },
  });

  void runCompletionPhase(args.runId);

  return getAddNodesRunSnapshot(args.runId);
}

async function runCompletionPhase(runId: string) {
  try {
    const state = getAddNodesRunState(runId);
    const snapshot = getAddNodesRunSnapshot(runId);
    if (!state || !snapshot) {
      throw new Error("Add-nodes run is no longer available.");
    }

    const generatedResult = await runStructuredPrompt({
      sessionId: runId,
      callId: "generate-nodes",
      callLabel: "Generate candidate nodes",
      modelId: getHeavyModel(),
      prompt: buildNodeGenerationPrompt({
        project: state.project,
        selectedNode: state.selectedNode,
        brief: snapshot.brief,
        questions: state.questions,
        answers: state.answers,
      }),
      schema: createGeneratedNodeBatchSchema(state.project.nodeMetadataSchema),
      schemaName: "generatedNodeBatchSchema",
      reasoningEffort: "medium",
    });
    const generated = sanitizeGeneratedBatch(
      generatedResult,
      state.project.nodeMetadataSchema,
    );

    patchAddNodesRun(runId, (run) => {
      run.state.generatedBatch = generated;
      completeStep(
        run.snapshot,
        "generate-nodes",
        `Generated ${generated.nodes.length} candidate nodes and ${generated.links.length} links.`,
      );
      activateStep(run.snapshot, "persist-graph", "Writing generated nodes into the project graph.");
    });

    const persistedProject = await appendGeneratedNodesToProjectOnDisk({
      projectId: snapshot.projectId,
      generated,
    });
    await recordLlmSessionEvent(ADD_NODES_LLM_PIPELINE, runId, {
      stage: "graph-persisted",
      message: `Persisted ${generated.nodes.length} nodes and ${generated.links.length} links.`,
      data: {
        nodeIds: persistedProject.spatialMap.nodes.slice(-generated.nodes.length).map((node) => node.id),
      },
    });

    patchAddNodesRun(runId, (run) => {
      run.state.project = persistedProject;
      completeStep(
        run.snapshot,
        "persist-graph",
        `Persisted ${generated.nodes.length} nodes and ${generated.links.length} links.`,
      );
      activateStep(run.snapshot, "suggest-follow-ups", "Preparing next-step suggestions.");
    });

    const followUps = await runStructuredPrompt({
      sessionId: runId,
      callId: "suggest-follow-ups",
      callLabel: "Generate follow-up suggestions",
      modelId: getDefaultModel(),
      prompt: buildFollowUpPrompt({
        project: persistedProject,
        brief: snapshot.brief,
        summary: generated.summary,
        questions: state.questions,
        answers: state.answers,
      }),
      schema: followUpSchema,
      schemaName: "followUpSchema",
      reasoningEffort: "minimal",
    });

    const suggestions = sanitizeSuggestions(followUps.suggestions);

    patchAddNodesRun(runId, (run) => {
      run.snapshot.result = {
        summary: generated.summary,
        nodeCount: generated.nodes.length,
        linkCount: generated.links.length,
        suggestions,
        project: persistedProject,
      };
      completeStep(
        run.snapshot,
        "suggest-follow-ups",
        `Prepared ${suggestions.length} follow-up suggestions.`,
      );
      completeSnapshot(
        run.snapshot,
        `Added ${generated.nodes.length} nodes after ${state.questions.length} clarifying questions.`,
      );
    });
    await completeLlmSession(ADD_NODES_LLM_PIPELINE, runId, {
      summary: generated.summary,
      nodeCount: generated.nodes.length,
      linkCount: generated.links.length,
      suggestions,
    });
  } catch (error) {
    await failLlmSession(ADD_NODES_LLM_PIPELINE, runId, error);
    patchAddNodesRun(runId, (run) => {
      failSnapshot(
        run.snapshot,
        error instanceof Error ? error.message : "Failed to generate graph additions.",
      );
    });
  }
}

export function encodeAddNodesEvent(event: AddNodesRunEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function summarizeSelectedAnswers(snapshot: AddNodesRunSnapshot) {
  return snapshot.questions.map((question) => ({
    questionId: question.id,
    label: getOptionLabel(question, snapshot.answers[question.id] ?? ""),
  }));
}
