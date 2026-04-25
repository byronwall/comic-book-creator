import type {
  NodeImageGenerationRunEvent,
  NodeImageGenerationRunSnapshot,
  NodeImageGenerationStep,
  NodeImageGenerationStepId,
} from "./types";

const stepOrder: NodeImageGenerationStepId[] = [
  "capture-context",
  "plan-prompt",
  "generate-image",
  "attach-image",
  "complete",
];

const stepLabels: Record<NodeImageGenerationStepId, string> = {
  "capture-context": "Capture context",
  "plan-prompt": "Plan image prompt",
  "generate-image": "Generate image",
  "attach-image": "Attach image",
  complete: "Complete",
};

export function createInitialNodeImageGenerationSnapshot(args: {
  runId: string;
  projectId: string;
  nodeId: string;
}): NodeImageGenerationRunSnapshot {
  return {
    runId: args.runId,
    projectId: args.projectId,
    nodeId: args.nodeId,
    status: "queued",
    steps: createInitialSteps(),
    currentStepId: "capture-context",
    latestMessage: "Initializing node mockup generation.",
    startedAt: nowIso(),
    elapsedMs: 0,
  };
}

export function activateNodeImageGenerationStep(
  snapshot: NodeImageGenerationRunSnapshot,
  stepId: NodeImageGenerationStepId,
  detail: string,
) {
  touchSnapshot(snapshot);
  snapshot.status = "running";
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

export function completeNodeImageGenerationStep(
  snapshot: NodeImageGenerationRunSnapshot,
  stepId: NodeImageGenerationStepId,
  detail: string,
) {
  touchSnapshot(snapshot);
  const step = snapshot.steps.find((entry) => entry.id === stepId);
  if (!step) return;

  step.status = "completed";
  step.detail = detail;
  step.startedAt ??= nowIso();
  step.completedAt = nowIso();
  snapshot.latestMessage = detail;
}

export function failNodeImageGenerationSnapshot(
  snapshot: NodeImageGenerationRunSnapshot,
  message: string,
) {
  touchSnapshot(snapshot);
  snapshot.status = "failed";
  snapshot.error = message;
  snapshot.latestMessage = message;
  snapshot.completedAt = nowIso();
  if (!snapshot.currentStepId) return;

  const step = snapshot.steps.find((entry) => entry.id === snapshot.currentStepId);
  if (!step) return;

  step.status = "failed";
  step.detail = message;
  step.startedAt ??= nowIso();
  step.completedAt = nowIso();
}

export function completeNodeImageGenerationSnapshot(
  snapshot: NodeImageGenerationRunSnapshot,
  message: string,
) {
  touchSnapshot(snapshot);
  snapshot.status = "completed";
  snapshot.currentStepId = "complete";
  snapshot.latestMessage = message;
  snapshot.completedAt = nowIso();
  completeNodeImageGenerationStep(snapshot, "complete", message);
}

export function encodeNodeImageGenerationEvent(event: NodeImageGenerationRunEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function createInitialSteps(): NodeImageGenerationStep[] {
  return stepOrder.map((id) => ({
    id,
    label: stepLabels[id],
    status: "pending",
    detail: `${stepLabels[id]} has not started.`,
  }));
}

function touchSnapshot(snapshot: NodeImageGenerationRunSnapshot) {
  snapshot.elapsedMs = Math.max(0, Date.now() - Date.parse(snapshot.startedAt));
}

function nowIso() {
  return new Date().toISOString();
}
