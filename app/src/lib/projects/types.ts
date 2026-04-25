import type { SpatialMapData } from "~/lib/spatial-map/types";

export interface ProjectNodeMetadataField {
  key: string;
  label: string;
  defaultValue: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  nodeMetadataSchema: ProjectNodeMetadataField[];
  spatialMap: SpatialMapData;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  linkCount: number;
}
