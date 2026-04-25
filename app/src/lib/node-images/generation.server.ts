import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  completeLlmSession,
  failLlmSession,
  recordLlmSessionEvent,
  startLlmSession,
  withLlmCallLogging,
} from "~/lib/llm-logging/logger.server";
import {
  addProjectNodeImageSourcesOnDisk,
  readProjectByIdFromDisk,
} from "~/lib/projects/data.server";
import type { ProjectRecord } from "~/lib/projects/types";
import { generateLowCostMockupImage } from "./image-api.server";
import {
  getNodeImageGenerationRunSnapshot,
  patchNodeImageGenerationRun,
  registerNodeImageGenerationRun,
} from "./run-registry";
import {
  activateNodeImageGenerationStep,
  completeNodeImageGenerationSnapshot,
  completeNodeImageGenerationStep,
  createInitialNodeImageGenerationSnapshot,
  failNodeImageGenerationSnapshot,
} from "./run-snapshot";
import {
  buildNodeImageGenerationContext,
} from "./context";
import {
  buildNodeImagePromptPlanningPrompt,
  nodeMockupImageSizes,
} from "./prompts";
import type {
  NodeImageGenerationStartRequest,
} from "./types";

const imagePlanningSchema = z.object({
  title: z.string().min(1).max(80),
  imagePrompt: z.string().min(120).max(2600),
  size: z.enum(nodeMockupImageSizes),
  dimensionRationale: z.string().min(1).max(280),
});

const NODE_IMAGE_LLM_PIPELINE = "node-image-generation";

interface GenerateProjectNodeMockupImageInput {
  projectId: string;
  nodeId: string;
}

export async function startNodeImageGenerationRun(args: {
  projectId: string;
  input: NodeImageGenerationStartRequest;
}) {
  assertOpenAiKey();

  const project = await readProjectByIdFromDisk(args.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  if (!project.spatialMap.nodes.some((node) => node.id === args.input.nodeId)) {
    throw new Error("Node not found.");
  }

  const runId = `node-image-${crypto.randomUUID()}`;
  const snapshot = createInitialNodeImageGenerationSnapshot({
    runId,
    projectId: args.projectId,
    nodeId: args.input.nodeId,
  });

  registerNodeImageGenerationRun(snapshot);
  await startLlmSession(NODE_IMAGE_LLM_PIPELINE, runId, {
    startedAt: snapshot.startedAt,
    metadata: {
      projectId: args.projectId,
      nodeId: args.input.nodeId,
      mode: "background-run",
    },
  });
  await recordLlmSessionEvent(NODE_IMAGE_LLM_PIPELINE, runId, {
    stage: "run-created",
    message: "Created node-image generation LLM session.",
  });
  void runNodeImageGenerationPhase(runId);

  return { runId, snapshot };
}

export async function generateProjectNodeMockupImageOnDisk(
  input: GenerateProjectNodeMockupImageInput,
): Promise<ProjectRecord> {
  assertOpenAiKey();
  const sessionId = `node-image-direct-${crypto.randomUUID()}`;

  const project = await readProjectByIdFromDisk(input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  await startLlmSession(NODE_IMAGE_LLM_PIPELINE, sessionId, {
    metadata: {
      projectId: input.projectId,
      nodeId: input.nodeId,
      mode: "direct-call",
    },
  });

  try {
    const context = buildNodeImageGenerationContext({
      project,
      nodeId: input.nodeId,
    });
    await recordLlmSessionEvent(NODE_IMAGE_LLM_PIPELINE, sessionId, {
      stage: "capture-context",
      message: "Captured node and descendant context for direct image generation.",
      data: {
        targetNodeId: context.targetNode.id,
        descendantNodeIds: context.descendantNodes.map((node) => node.id),
      },
    });
    const plannedImage = await planNodeMockupImage(context, sessionId, "plan-prompt");
    const image = await generateLowCostMockupImage(plannedImage, {
      pipeline: NODE_IMAGE_LLM_PIPELINE,
      sessionId,
      callId: "generate-image",
      label: "Generate mockup image",
    });

    const updatedProject = await addProjectNodeImageSourcesOnDisk({
      projectId: input.projectId,
      nodeIds: [input.nodeId],
      images: [
        {
          originalName: `${slugifyName(plannedImage.title)}.png`,
          mimeType: "image/png",
          size: image.byteLength,
          data: image,
        },
      ],
    });
    await completeLlmSession(NODE_IMAGE_LLM_PIPELINE, sessionId, {
      title: plannedImage.title,
      size: plannedImage.size,
      imageByteLength: image.byteLength,
    });
    return updatedProject;
  } catch (error) {
    await failLlmSession(NODE_IMAGE_LLM_PIPELINE, sessionId, error);
    throw error;
  }
}

async function runNodeImageGenerationPhase(runId: string) {
  try {
    patchNodeImageGenerationRun(runId, (run) => {
      activateNodeImageGenerationStep(
        run.snapshot,
        "capture-context",
        "Gathering selected node and child hierarchy.",
      );
    });

    const snapshot = getNodeImageGenerationRunSnapshot(runId);
    if (!snapshot) {
      throw new Error("Node image generation run is no longer available.");
    }

    const project = await readProjectByIdFromDisk(snapshot.projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const context = buildNodeImageGenerationContext({
      project,
      nodeId: snapshot.nodeId,
    });
    await recordLlmSessionEvent(NODE_IMAGE_LLM_PIPELINE, runId, {
      stage: "capture-context",
      message: "Captured selected node and descendants for image planning.",
      data: {
        targetNodeId: context.targetNode.id,
        descendantNodeIds: context.descendantNodes.map((node) => node.id),
      },
    });

    patchNodeImageGenerationRun(runId, (run) => {
      completeNodeImageGenerationStep(
        run.snapshot,
        "capture-context",
        `Captured ${context.descendantNodes.length} child/descendant nodes for ${context.targetNode.label}.`,
      );
      activateNodeImageGenerationStep(
        run.snapshot,
        "plan-prompt",
        "Asking the text model to plan prompt and dimensions.",
      );
    });

    const plan = await planNodeMockupImage(context, runId, "plan-prompt");

    patchNodeImageGenerationRun(runId, (run) => {
      run.snapshot.plan = plan;
      completeNodeImageGenerationStep(
        run.snapshot,
        "plan-prompt",
        `Planned ${plan.size} mockup: ${plan.title}.`,
      );
      activateNodeImageGenerationStep(
        run.snapshot,
        "generate-image",
        "Calling GPT-Image-2 with low quality PNG settings.",
      );
    });

    const image = await generateLowCostMockupImage(plan, {
      pipeline: NODE_IMAGE_LLM_PIPELINE,
      sessionId: runId,
      callId: "generate-image",
      label: "Generate mockup image",
    });

    patchNodeImageGenerationRun(runId, (run) => {
      completeNodeImageGenerationStep(
        run.snapshot,
        "generate-image",
        `Generated ${formatBytes(image.byteLength)} PNG.`,
      );
      activateNodeImageGenerationStep(
        run.snapshot,
        "attach-image",
        "Writing image to project storage and attaching it to the node.",
      );
    });

    const updatedProject = await addProjectNodeImageSourcesOnDisk({
      projectId: snapshot.projectId,
      nodeIds: [snapshot.nodeId],
      images: [
        {
          originalName: `${slugifyName(plan.title)}.png`,
          mimeType: "image/png",
          size: image.byteLength,
          data: image,
        },
      ],
    });
    const node = updatedProject.spatialMap.nodes.find((item) => item.id === snapshot.nodeId);

    patchNodeImageGenerationRun(runId, (run) => {
      completeNodeImageGenerationStep(
        run.snapshot,
        "attach-image",
        "Attached generated mockup to the node image list.",
      );
      run.snapshot.result = {
        title: plan.title,
        size: plan.size,
        imageCount: node?.images?.length ?? 0,
        project: updatedProject,
      };
      completeNodeImageGenerationSnapshot(
        run.snapshot,
        "Generated and attached node mockup image.",
      );
    });
    await completeLlmSession(NODE_IMAGE_LLM_PIPELINE, runId, {
      title: plan.title,
      size: plan.size,
      imageByteLength: image.byteLength,
      nodeId: snapshot.nodeId,
    });
  } catch (error) {
    await failLlmSession(NODE_IMAGE_LLM_PIPELINE, runId, error);
    patchNodeImageGenerationRun(runId, (run) => {
      failNodeImageGenerationSnapshot(
        run.snapshot,
        error instanceof Error ? error.message : "Failed to generate node mockup image.",
      );
    });
  }
}

function getPromptModel() {
  return process.env.OPENAI_MODEL ?? "gpt-5-mini";
}

function assertOpenAiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
}

async function planNodeMockupImage(
  context: ReturnType<typeof buildNodeImageGenerationContext>,
  sessionId: string,
  callId: string,
) {
  const prompt = buildNodeImagePromptPlanningPrompt(context);
  const result = await withLlmCallLogging(
    NODE_IMAGE_LLM_PIPELINE,
    sessionId,
    {
      callId,
      label: "Plan node image prompt",
      request: {
        provider: "openai",
        modelId: getPromptModel(),
        prompt,
        schemaName: "imagePlanningSchema",
        maxRetries: 1,
        reasoningEffort: "low",
      },
    },
    () =>
      generateText({
        model: openai(getPromptModel()),
        prompt,
        maxRetries: 1,
        experimental_output: Output.object({ schema: imagePlanningSchema }),
        providerOptions: { openai: { reasoningEffort: "low" } },
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

function slugifyName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "generated-node-mockup";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}
