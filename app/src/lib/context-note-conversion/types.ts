import type { ProjectRecord } from "~/lib/projects/types";
import type { MapLink, MapNode } from "~/lib/spatial-map/types";

export type ContextNoteConversionRunStepId =
  | "capture-context"
  | "generate-questions"
  | "await-answers"
  | "generate-suggestions"
  | "await-selection"
  | "persist-graph"
  | "trim-context"
  | "complete";

export type ContextNoteConversionRunStatus =
  | "queued"
  | "running"
  | "awaiting-input"
  | "awaiting-review"
  | "completed"
  | "failed";

export type ContextNoteConversionRunStepStatus =
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

export interface ConversionCandidateTreeItem {
  nodeId: string;
  label: string;
  type: string;
  depth: number;
  metadata: Record<string, string>;
  childNodeIds: string[];
}

export interface ConversionCandidateTree {
  roots: string[];
  items: Record<string, ConversionCandidateTreeItem>;
}

export interface ConversionCandidateBatch {
  summary: string;
  nodes: MapNode[];
  links: MapLink[];
  tree: ConversionCandidateTree;
}

export interface ContextTrimResult {
  trimmedContext: string;
  summary: string;
}

export interface ContextNoteConversionRunStep {
  id: ContextNoteConversionRunStepId;
  label: string;
  status: ContextNoteConversionRunStepStatus;
  detail: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ContextNoteConversionRunResult {
  summary: string;
  acceptedNodeCount: number;
  acceptedLinkCount: number;
  trimSummary: string;
  project: ProjectRecord;
}

export interface ContextNoteConversionRunSnapshot {
  runId: string;
  projectId: string;
  sourceNodeId: string;
  status: ContextNoteConversionRunStatus;
  steps: ContextNoteConversionRunStep[];
  currentStepId: ContextNoteConversionRunStepId | null;
  latestMessage: string;
  startedAt: string;
  completedAt?: string;
  elapsedMs: number;
  error?: string;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  candidateBatch?: ConversionCandidateBatch;
  acceptedNodeIds: string[];
  result?: ContextNoteConversionRunResult;
}

export type ContextNoteConversionRunEvent =
  | { type: "snapshot"; snapshot: ContextNoteConversionRunSnapshot }
  | { type: "complete"; snapshot: ContextNoteConversionRunSnapshot }
  | { type: "failed"; snapshot: ContextNoteConversionRunSnapshot };

export interface ContextNoteConversionRunStartRequest {
  sourceNodeId: string;
}

export interface ContextNoteConversionRunAnswerRequest {
  answers: Record<string, string>;
}

export interface ContextNoteConversionRunAcceptRequest {
  acceptedNodeIds: string[];
}

export interface ContextNoteConversionRunStartResponse {
  runId: string;
  snapshot: ContextNoteConversionRunSnapshot;
}

export interface ContextNoteConversionRunState {
  project: ProjectRecord;
  sourceNode: MapNode;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  candidateBatch?: ConversionCandidateBatch;
}
