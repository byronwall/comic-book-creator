import type { ProjectRecord } from "~/lib/projects/types";
import type { MapLink, MapNode } from "~/lib/spatial-map/types";
import type { ConversionCandidateBatch } from "~/lib/context-note-conversion/types";

export type SourceDecompositionRunStepId =
  | "capture-source"
  | "decompose-source"
  | "await-selection"
  | "persist-graph"
  | "attach-sources"
  | "complete";

export type SourceDecompositionRunStatus =
  | "queued"
  | "running"
  | "awaiting-review"
  | "completed"
  | "failed";

export type SourceDecompositionRunStepStatus =
  | "pending"
  | "active"
  | "completed"
  | "failed";

export interface SourceAssetSummary {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface SourceAsset extends SourceAssetSummary {
  data: Buffer;
}

export interface SourceDecompositionCandidateBatch extends ConversionCandidateBatch {
  styleCommentary: string;
  sourceAssetIdsByNodeId: Record<string, string[]>;
}

export interface SourceDecompositionRunStep {
  id: SourceDecompositionRunStepId;
  label: string;
  status: SourceDecompositionRunStepStatus;
  detail: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SourceDecompositionRunResult {
  summary: string;
  styleCommentary: string;
  acceptedNodeCount: number;
  acceptedLinkCount: number;
  attachedImageCount: number;
  project: ProjectRecord;
}

export interface SourceDecompositionRunSnapshot {
  runId: string;
  projectId: string;
  status: SourceDecompositionRunStatus;
  steps: SourceDecompositionRunStep[];
  currentStepId: SourceDecompositionRunStepId | null;
  latestMessage: string;
  sourceText: string;
  sourceAssets: SourceAssetSummary[];
  selectedNodeId: string | null;
  startedAt: string;
  completedAt?: string;
  elapsedMs: number;
  error?: string;
  candidateBatch?: SourceDecompositionCandidateBatch;
  acceptedNodeIds: string[];
  result?: SourceDecompositionRunResult;
}

export type SourceDecompositionRunEvent =
  | { type: "snapshot"; snapshot: SourceDecompositionRunSnapshot }
  | { type: "complete"; snapshot: SourceDecompositionRunSnapshot }
  | { type: "failed"; snapshot: SourceDecompositionRunSnapshot };

export interface SourceDecompositionRunStartRequest {
  sourceText: string;
  selectedNodeId?: string | null;
  images: File[];
}

export interface SourceDecompositionRunAcceptRequest {
  acceptedNodeIds: string[];
}

export interface SourceDecompositionRunStartResponse {
  runId: string;
  snapshot: SourceDecompositionRunSnapshot;
}

export interface SourceDecompositionRunState {
  project: ProjectRecord;
  selectedNode: MapNode | null;
  sourceAssets: SourceAsset[];
  candidateBatch?: SourceDecompositionCandidateBatch;
  persistedNodeIds?: string[];
  persistedLinks?: MapLink[];
}
