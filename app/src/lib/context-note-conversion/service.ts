import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createNodeMetadataObjectSchema } from "~/lib/projects/node-metadata.zod";
import {
  createDefaultProjectNodeMetadataSchema,
  sanitizeNodeMetadata,
} from "~/lib/projects/node-metadata";
import {
  appendGeneratedNodesToProjectOnDisk,
  readProjectByIdFromDisk,
  updateProjectNodeContextOnDisk,
} from "~/lib/projects/data.server";
import {
  completeLlmSession,
  failLlmSession,
  recordLlmSessionEvent,
  startLlmSession,
  withLlmCallLogging,
} from "~/lib/llm-logging/logger.server";
import type { MapLink, MapNode } from "~/lib/spatial-map/types";
import { buildCandidateTree } from "./tree";
import {
  getContextNoteConversionRunSnapshot,
  getContextNoteConversionRunState,
  patchContextNoteConversionRun,
  registerContextNoteConversionRun,
} from "./run-registry";
import { buildQuestionPrompt, buildSuggestionPrompt, buildTrimPrompt } from "./prompts";
import type {
  ClarifyingQuestion,
  ContextNoteConversionRunAcceptRequest,
  ContextNoteConversionRunAnswerRequest,
  ContextNoteConversionRunEvent,
  ContextNoteConversionRunSnapshot,
  ContextNoteConversionRunStartRequest,
  ContextNoteConversionRunStep,
  ContextNoteConversionRunStepId,
  ConversionCandidateBatch,
} from "./types";

const questionSetSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().min(1),
      prompt: z.string().min(1),
      helperText: z.string().min(1),
      options: z.array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          detail: z.string().min(1),
        }),
      ).min(3).max(4),
    }),
  ).min(3).max(4),
});

const candidateLinkSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  parentChild: z.boolean(),
  relationship: z.enum(["related", "dependency", "reuse"]).optional(),
});

const trimResultSchema = z.object({
  trimmedContext: z.string(),
  summary: z.string().min(1),
});

const stepOrder: ContextNoteConversionRunStepId[] = [
  "capture-context",
  "generate-questions",
  "await-answers",
  "generate-suggestions",
  "await-selection",
  "persist-graph",
  "trim-context",
  "complete",
];

const stepLabels: Record<ContextNoteConversionRunStepId, string> = {
  "capture-context": "Capture context",
  "generate-questions": "Generate questions",
  "await-answers": "Await answers",
  "generate-suggestions": "Generate suggestions",
  "await-selection": "Await selection",
  "persist-graph": "Persist graph",
  "trim-context": "Trim context",
  complete: "Complete",
};

const CONTEXT_NOTE_CONVERSION_LLM_PIPELINE = "context-note-conversion";

function createCandidateBatchSchema(
  nodeMetadataSchema: NonNullable<Awaited<ReturnType<typeof readProjectByIdFromDisk>>>["nodeMetadataSchema"],
) {
  return z.object({
    summary: z.string().min(1),
    nodes: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        type: z.string().min(1),
        depth: z.number().int().min(0),
        metadata: createNodeMetadataObjectSchema(nodeMetadataSchema),
        context: z.string().default(""),
        rawContext: z.string().default(""),
        contextMode: z.literal("structured").default("structured"),
      }),
    ).min(1).max(10),
    links: z.array(candidateLinkSchema),
  });
}

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

function createInitialSteps(): ContextNoteConversionRunStep[] {
  return stepOrder.map((id) => ({
    id,
    label: stepLabels[id],
    status: "pending",
    detail:
      id === "await-answers"
        ? "Waiting for clarification choices."
        : id === "await-selection"
          ? "Waiting for candidate selection."
          : `${stepLabels[id]} has not started.`,
  }));
}

function createInitialSnapshot(args: {
  runId: string;
  projectId: string;
  sourceNodeId: string;
}): ContextNoteConversionRunSnapshot {
  return {
    runId: args.runId,
    projectId: args.projectId,
    sourceNodeId: args.sourceNodeId,
    status: "queued",
    steps: createInitialSteps(),
    currentStepId: "capture-context",
    latestMessage: "Initializing note conversion.",
    startedAt: nowIso(),
    elapsedMs: 0,
    questions: [],
    answers: {},
    acceptedNodeIds: [],
  };
}

function touchSnapshot(snapshot: ContextNoteConversionRunSnapshot) {
  snapshot.elapsedMs = Math.max(0, Date.now() - Date.parse(snapshot.startedAt));
}

function activateStep(snapshot: ContextNoteConversionRunSnapshot, stepId: ContextNoteConversionRunStepId, detail: string) {
  touchSnapshot(snapshot);
  snapshot.status =
    stepId === "await-answers"
      ? "awaiting-input"
      : stepId === "await-selection"
        ? "awaiting-review"
        : "running";
  snapshot.currentStepId = stepId;
  snapshot.latestMessage = detail;

  for (const step of snapshot.steps) {
    if (step.id === stepId) {
      step.status = "active";
      step.detail = detail;
      step.startedAt ??= nowIso();
    }
  }
}

function completeStep(snapshot: ContextNoteConversionRunSnapshot, stepId: ContextNoteConversionRunStepId, detail: string) {
  touchSnapshot(snapshot);
  const step = snapshot.steps.find((entry) => entry.id === stepId);
  if (!step) return;
  step.status = "completed";
  step.detail = detail;
  step.startedAt ??= nowIso();
  step.completedAt = nowIso();
  snapshot.latestMessage = detail;
}

function failSnapshot(snapshot: ContextNoteConversionRunSnapshot, message: string) {
  touchSnapshot(snapshot);
  snapshot.status = "failed";
  snapshot.error = message;
  snapshot.latestMessage = message;
  snapshot.completedAt = nowIso();
  const step = snapshot.currentStepId
    ? snapshot.steps.find((entry) => entry.id === snapshot.currentStepId)
    : null;
  if (step) {
    step.status = "failed";
    step.detail = message;
    step.startedAt ??= nowIso();
    step.completedAt = nowIso();
  }
}

function completeSnapshot(snapshot: ContextNoteConversionRunSnapshot, message: string) {
  touchSnapshot(snapshot);
  snapshot.status = "completed";
  snapshot.currentStepId = "complete";
  snapshot.latestMessage = message;
  snapshot.completedAt = nowIso();
  completeStep(snapshot, "complete", message);
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
    CONTEXT_NOTE_CONVERSION_LLM_PIPELINE,
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

function sanitizeCandidateNodes(
  nodes: Array<Omit<MapNode, "metadata"> & { metadata: Record<string, string | undefined> }>,
  nodeMetadataSchema = createDefaultProjectNodeMetadataSchema(),
) {
  return nodes.map((node) => ({
    ...node,
    metadata: sanitizeNodeMetadata(node.metadata, nodeMetadataSchema, {
      omitDefaultValues: true,
    }),
    context: node.context ?? "",
    rawContext: node.rawContext ?? node.context ?? "",
    contextMode: "structured" as const,
  }));
}

function sanitizeCandidateLinks(links: z.infer<typeof candidateLinkSchema>[]): MapLink[] {
  return links.map((link) =>
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
  );
}

function createCandidateBatch(
  summary: string,
  nodes: Array<Omit<MapNode, "metadata"> & { metadata: Record<string, string | undefined> }>,
  links: MapLink[],
  nodeMetadataSchema = createDefaultProjectNodeMetadataSchema(),
): ConversionCandidateBatch {
  const sanitizedNodes = sanitizeCandidateNodes(nodes, nodeMetadataSchema);
  const sanitizedLinks = sanitizeCandidateLinks(links);
  return {
    summary,
    nodes: sanitizedNodes,
    links: sanitizedLinks,
    tree: buildCandidateTree(sanitizedNodes, sanitizedLinks),
  };
}

function filterAcceptedBatch(batch: ConversionCandidateBatch, acceptedNodeIds: string[]) {
  const acceptedSet = new Set(acceptedNodeIds);
  const nodes = batch.nodes.filter((node) => acceptedSet.has(node.id));
  const links = batch.links.filter((link) => {
    const sourceAccepted = acceptedSet.has(link.source);
    const targetAccepted = acceptedSet.has(link.target);
    return (sourceAccepted && targetAccepted) || (sourceAccepted && !batch.tree.items[link.target]) || (!batch.tree.items[link.source] && targetAccepted);
  });

  return {
    summary: batch.summary,
    nodes,
    links,
    tree: buildCandidateTree(nodes, links),
  };
}

function sanitizeCandidateBatch(
  batch: ReturnType<typeof createCandidateBatchSchema>["_output"],
  nodeMetadataSchema = createDefaultProjectNodeMetadataSchema(),
): ConversionCandidateBatch {
  const nodes = batch.nodes.map((node) => ({
    ...node,
    metadata: sanitizeNodeMetadata(node.metadata, nodeMetadataSchema, {
      omitDefaultValues: true,
    }),
  }));
  const links = batch.links.map((link) =>
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
  );

  return {
    summary: batch.summary,
    nodes,
    links,
    tree: buildCandidateTree(nodes, links),
  };
}

export function parseQuestionSet(input: unknown) {
  return questionSetSchema.parse(input);
}

export function parseCandidateBatch(input: unknown) {
  const nodeMetadataSchema = createDefaultProjectNodeMetadataSchema();
  return sanitizeCandidateBatch(
    createCandidateBatchSchema(nodeMetadataSchema).parse(input),
    nodeMetadataSchema,
  );
}

export function parseTrimResult(input: unknown) {
  return trimResultSchema.parse(input);
}

export async function startContextNoteConversionRun(args: {
  projectId: string;
  input: ContextNoteConversionRunStartRequest;
}) {
  const project = await readProjectByIdFromDisk(args.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const sourceNode = project.spatialMap.nodes.find((node) => node.id === args.input.sourceNodeId);
  if (!sourceNode) {
    throw new Error("Source note not found.");
  }
  if (sourceNode.contextMode !== "context-only") {
    throw new Error("Only context-only notes can be converted.");
  }

  const runId = `context-note-conversion-${crypto.randomUUID()}`;
  const snapshot = createInitialSnapshot({
    runId,
    projectId: project.id,
    sourceNodeId: sourceNode.id,
  });

  registerContextNoteConversionRun(snapshot, {
    project,
    sourceNode,
    questions: [],
    answers: {},
  });

  await startLlmSession(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, {
    startedAt: snapshot.startedAt,
    metadata: {
      projectId: project.id,
      sourceNodeId: sourceNode.id,
      sourceContext: sourceNode.context,
    },
  });
  await recordLlmSessionEvent(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, {
    stage: "run-created",
    message: "Created context-note conversion LLM session.",
  });

  void runQuestionPhase(runId);

  return { runId, snapshot };
}

async function runQuestionPhase(runId: string) {
  try {
    await recordLlmSessionEvent(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, {
      stage: "capture-context",
      message: "Captured project graph and source note context.",
    });
    patchContextNoteConversionRun(runId, (run) => {
      activateStep(run.snapshot, "capture-context", "Inspecting project graph and source note context.");
      completeStep(run.snapshot, "capture-context", "Project graph context captured.");
      activateStep(run.snapshot, "generate-questions", "Drafting clarifying questions.");
    });

    const state = getContextNoteConversionRunState(runId);
    if (!state) {
      throw new Error("Conversion run is no longer available.");
    }

    const questionResult = await runStructuredPrompt({
      sessionId: runId,
      callId: "generate-questions",
      callLabel: "Generate clarifying questions",
      modelId: getDefaultModel(),
      prompt: buildQuestionPrompt({
        project: state.project,
        sourceNode: state.sourceNode,
      }),
      schema: questionSetSchema,
      schemaName: "questionSetSchema",
      reasoningEffort: "minimal",
    });

    const questions = sanitizeQuestions(questionResult.questions);
    patchContextNoteConversionRun(runId, (run) => {
      run.state.questions = questions;
      run.snapshot.questions = questions;
      completeStep(run.snapshot, "generate-questions", `Prepared ${questions.length} clarifying questions.`);
      activateStep(run.snapshot, "await-answers", "Choose one answer for each question to generate structured suggestions.");
    });
    await recordLlmSessionEvent(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, {
      stage: "questions-generated",
      message: `Prepared ${questions.length} clarifying questions.`,
      data: { questions },
    });
  } catch (error) {
    await failLlmSession(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, error);
    patchContextNoteConversionRun(runId, (run) => {
      failSnapshot(
        run.snapshot,
        error instanceof Error ? error.message : "Failed to prepare clarifying questions.",
      );
    });
  }
}

export async function submitContextNoteConversionAnswers(args: {
  projectId: string;
  runId: string;
  input: ContextNoteConversionRunAnswerRequest;
}) {
  const snapshot = getContextNoteConversionRunSnapshot(args.runId);
  const state = getContextNoteConversionRunState(args.runId);

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

  patchContextNoteConversionRun(args.runId, (run) => {
    run.state.answers = { ...args.input.answers };
    run.snapshot.answers = { ...args.input.answers };
    completeStep(run.snapshot, "await-answers", `Captured ${Object.keys(args.input.answers).length} clarifying answers.`);
    activateStep(run.snapshot, "generate-suggestions", "Generating candidate structured nodes from the note.");
  });
  await recordLlmSessionEvent(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, args.runId, {
    stage: "answers-submitted",
    message: `Captured ${Object.keys(args.input.answers).length} clarifying answers.`,
    data: { answers: args.input.answers },
  });

  void runSuggestionPhase(args.runId);
  return getContextNoteConversionRunSnapshot(args.runId);
}

async function runSuggestionPhase(runId: string) {
  try {
    const state = getContextNoteConversionRunState(runId);
    if (!state) {
      throw new Error("Conversion run is no longer available.");
    }

    const generated = await runStructuredPrompt({
      sessionId: runId,
      callId: "generate-suggestions",
      callLabel: "Generate structured node suggestions",
      modelId: getHeavyModel(),
      prompt: buildSuggestionPrompt({
        project: state.project,
        sourceNode: state.sourceNode,
        questions: state.questions,
        answers: state.answers,
      }),
      schema: createCandidateBatchSchema(state.project.nodeMetadataSchema),
      schemaName: "candidateBatchSchema",
      reasoningEffort: "medium",
    });

    const batch = createCandidateBatch(
      generated.summary,
      generated.nodes,
      generated.links,
      state.project.nodeMetadataSchema,
    );
    patchContextNoteConversionRun(runId, (run) => {
      run.state.candidateBatch = batch;
      run.snapshot.candidateBatch = batch;
      completeStep(
        run.snapshot,
        "generate-suggestions",
        `Prepared ${batch.nodes.length} candidate nodes for review.`,
      );
      activateStep(run.snapshot, "await-selection", "Review the structured suggestions and uncheck anything you do not want to add.");
    });
    await recordLlmSessionEvent(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, {
      stage: "suggestions-generated",
      message: `Prepared ${batch.nodes.length} candidate nodes for review.`,
      data: {
        summary: batch.summary,
        nodeIds: batch.nodes.map((node) => node.id),
      },
    });
  } catch (error) {
    await failLlmSession(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, error);
    patchContextNoteConversionRun(runId, (run) => {
      failSnapshot(
        run.snapshot,
        error instanceof Error ? error.message : "Failed to generate structured suggestions.",
      );
    });
  }
}

export async function acceptContextNoteConversionSelection(args: {
  projectId: string;
  runId: string;
  input: ContextNoteConversionRunAcceptRequest;
}) {
  const snapshot = getContextNoteConversionRunSnapshot(args.runId);
  const state = getContextNoteConversionRunState(args.runId);

  if (!snapshot || !state || snapshot.projectId !== args.projectId) {
    throw new Error("Run not found.");
  }
  if (snapshot.status !== "awaiting-review" || !state.candidateBatch) {
    throw new Error("This run is not waiting for candidate selection.");
  }

  const acceptedNodeIds = [...new Set(args.input.acceptedNodeIds)];
  if (acceptedNodeIds.length === 0) {
    throw new Error("Select at least one candidate node to continue.");
  }

  const candidateNodeIds = new Set(state.candidateBatch.nodes.map((node) => node.id));
  for (const nodeId of acceptedNodeIds) {
    if (!candidateNodeIds.has(nodeId)) {
      throw new Error(`Invalid candidate node "${nodeId}".`);
    }
  }

  patchContextNoteConversionRun(args.runId, (run) => {
    run.snapshot.acceptedNodeIds = acceptedNodeIds;
    completeStep(run.snapshot, "await-selection", `Accepted ${acceptedNodeIds.length} candidate nodes for persistence.`);
    activateStep(run.snapshot, "persist-graph", "Writing accepted nodes into the project graph.");
  });
  await recordLlmSessionEvent(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, args.runId, {
    stage: "selection-accepted",
    message: `Accepted ${acceptedNodeIds.length} candidate nodes for persistence.`,
    data: { acceptedNodeIds },
  });

  void runAcceptancePhase(args.runId, acceptedNodeIds);
  return getContextNoteConversionRunSnapshot(args.runId);
}

async function runAcceptancePhase(runId: string, acceptedNodeIds: string[]) {
  try {
    const state = getContextNoteConversionRunState(runId);
    const snapshot = getContextNoteConversionRunSnapshot(runId);
    if (!state || !snapshot || !state.candidateBatch) {
      throw new Error("Conversion run is no longer available.");
    }

    const acceptedBatch = filterAcceptedBatch(state.candidateBatch, acceptedNodeIds);
    const persistedProject = await appendGeneratedNodesToProjectOnDisk({
      projectId: snapshot.projectId,
      generated: {
        summary: acceptedBatch.summary,
        nodes: acceptedBatch.nodes,
        links: acceptedBatch.links,
      },
    });
    await recordLlmSessionEvent(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, {
      stage: "graph-persisted",
      message: `Persisted ${acceptedBatch.nodes.length} accepted nodes and ${acceptedBatch.links.length} links.`,
      data: {
        acceptedNodeIds,
      },
    });

    patchContextNoteConversionRun(runId, (run) => {
      run.state.project = persistedProject;
      completeStep(
        run.snapshot,
        "persist-graph",
        `Persisted ${acceptedBatch.nodes.length} accepted nodes and ${acceptedBatch.links.length} links.`,
      );
      activateStep(run.snapshot, "trim-context", "Trimming the source note down to unincorporated context.");
    });

    const refreshedSourceNode = persistedProject.spatialMap.nodes.find((node) => node.id === snapshot.sourceNodeId);
    if (!refreshedSourceNode) {
      throw new Error("Source note not found after persistence.");
    }

    const trimResult = await runStructuredPrompt({
      sessionId: runId,
      callId: "trim-context",
      callLabel: "Trim remaining note context",
      modelId: getDefaultModel(),
      prompt: buildTrimPrompt({
        project: persistedProject,
        sourceNode: refreshedSourceNode,
        acceptedSummary: acceptedBatch.summary,
        acceptedNodes: acceptedBatch.nodes,
      }),
      schema: trimResultSchema,
      schemaName: "trimResultSchema",
      reasoningEffort: "low",
    });

    const trimmedProject = await updateProjectNodeContextOnDisk({
      projectId: snapshot.projectId,
      nodeId: snapshot.sourceNodeId,
      context: trimResult.trimmedContext,
    });

    patchContextNoteConversionRun(runId, (run) => {
      run.state.project = trimmedProject;
      run.state.sourceNode =
        trimmedProject.spatialMap.nodes.find((node) => node.id === snapshot.sourceNodeId) ?? run.state.sourceNode;
      run.snapshot.result = {
        summary: acceptedBatch.summary,
        acceptedNodeCount: acceptedBatch.nodes.length,
        acceptedLinkCount: acceptedBatch.links.length,
        trimSummary: trimResult.summary,
        project: trimmedProject,
      };
      completeStep(run.snapshot, "trim-context", trimResult.summary);
      completeSnapshot(
        run.snapshot,
        `Added ${acceptedBatch.nodes.length} nodes and trimmed the source note.`,
      );
    });
    await completeLlmSession(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, {
      summary: acceptedBatch.summary,
      acceptedNodeIds,
      acceptedLinkCount: acceptedBatch.links.length,
      trimSummary: trimResult.summary,
    });
  } catch (error) {
    await failLlmSession(CONTEXT_NOTE_CONVERSION_LLM_PIPELINE, runId, error);
    patchContextNoteConversionRun(runId, (run) => {
      failSnapshot(
        run.snapshot,
        error instanceof Error ? error.message : "Failed to persist accepted suggestions.",
      );
    });
  }
}

export function encodeContextNoteConversionEvent(event: ContextNoteConversionRunEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
