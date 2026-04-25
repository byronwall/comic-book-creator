import type { ProjectRecord } from "~/lib/projects/types";

export type NodeImageGenerationStepId =
  | "capture-context"
  | "plan-prompt"
  | "generate-image"
  | "attach-image"
  | "complete";

export type NodeImageGenerationRunStatus = "queued" | "running" | "completed" | "failed";

export type NodeImageGenerationStepStatus = "pending" | "active" | "completed" | "failed";

export interface NodeImageGenerationStep {
  id: NodeImageGenerationStepId;
  label: string;
  status: NodeImageGenerationStepStatus;
  detail: string;
  startedAt?: string;
  completedAt?: string;
}

export interface NodeImageGenerationPlan {
  title: string;
  imagePrompt: string;
  size: "816x816" | "1024x768" | "768x1024";
  dimensionRationale: string;
}

export interface NodeImageGenerationResult {
  title: string;
  size: NodeImageGenerationPlan["size"];
  imageCount: number;
  project: ProjectRecord;
}

export interface NodeImageGenerationRunSnapshot {
  runId: string;
  projectId: string;
  nodeId: string;
  status: NodeImageGenerationRunStatus;
  steps: NodeImageGenerationStep[];
  currentStepId: NodeImageGenerationStepId | null;
  latestMessage: string;
  startedAt: string;
  completedAt?: string;
  elapsedMs: number;
  error?: string;
  plan?: NodeImageGenerationPlan;
  result?: NodeImageGenerationResult;
}

export type NodeImageGenerationRunEvent =
  | { type: "snapshot"; snapshot: NodeImageGenerationRunSnapshot }
  | { type: "complete"; snapshot: NodeImageGenerationRunSnapshot }
  | { type: "failed"; snapshot: NodeImageGenerationRunSnapshot };

export interface NodeImageGenerationStartRequest {
  nodeId: string;
}

export interface NodeImageGenerationStartResponse {
  runId: string;
  snapshot: NodeImageGenerationRunSnapshot;
}
