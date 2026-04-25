import type { ProjectRecord } from "~/lib/projects/types";
import type { MapLink, MapNode } from "~/lib/spatial-map/types";

export type AddNodesRunStepId =
  | "capture-context"
  | "generate-questions"
  | "await-answers"
  | "generate-nodes"
  | "persist-graph"
  | "suggest-follow-ups"
  | "complete";

export type AddNodesRunStatus =
  | "queued"
  | "running"
  | "awaiting-input"
  | "completed"
  | "failed";

export type AddNodesRunStepStatus =
  | "pending"
  | "active"
  | "completed"
  | "failed";

export interface ClarifyingOption {
  id: string;
  label: string;
  detail: string;
}

export interface ClarifyingQuestion {
  id: string;
  prompt: string;
  helperText: string;
  options: ClarifyingOption[];
}

export interface FollowUpSuggestion {
  id: string;
  label: string;
  brief: string;
  guidance: string;
}

export interface GeneratedNodeBatch {
  summary: string;
  nodes: MapNode[];
  links: MapLink[];
}

export interface AddNodesRunStep {
  id: AddNodesRunStepId;
  label: string;
  status: AddNodesRunStepStatus;
  detail: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AddNodesRunResult {
  summary: string;
  nodeCount: number;
  linkCount: number;
  suggestions: FollowUpSuggestion[];
  project: ProjectRecord;
}

export interface AddNodesRunSnapshot {
  runId: string;
  projectId: string;
  status: AddNodesRunStatus;
  steps: AddNodesRunStep[];
  currentStepId: AddNodesRunStepId | null;
  latestMessage: string;
  brief: string;
  selectedNodeId: string | null;
  startedAt: string;
  completedAt?: string;
  elapsedMs: number;
  error?: string;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  result?: AddNodesRunResult;
}

export type AddNodesRunEvent =
  | { type: "snapshot"; snapshot: AddNodesRunSnapshot }
  | { type: "complete"; snapshot: AddNodesRunSnapshot }
  | { type: "failed"; snapshot: AddNodesRunSnapshot };

export interface AddNodesRunStartRequest {
  brief: string;
  selectedNodeId?: string | null;
}

export interface AddNodesRunAnswerRequest {
  answers: Record<string, string>;
}

export interface AddNodesRunStartResponse {
  runId: string;
  snapshot: AddNodesRunSnapshot;
}

export interface AddNodesRunState {
  project: ProjectRecord;
  selectedNode: MapNode | null;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  generatedBatch?: GeneratedNodeBatch;
}
