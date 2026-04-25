export interface MapNode {
  id: string;
  label: string;
  type: string;
  depth: number;
  metadata: Record<string, string>;
  context: string;
  rawContext: string;
  contextMode: "context-only" | "structured";
  images?: MapNodeImage[];
}

export interface MapNodeImage {
  id: string;
  src: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface MapLink {
  source: string;
  target: string;
  parentChild: boolean;
  relationship?: MapLinkRelationship;
}

export type MapLinkRelationship = "related" | "dependency" | "reuse";

export interface SpatialMapData {
  nodes: MapNode[];
  links: MapLink[];
}

export interface NodeSize {
  width: number;
  height: number;
  fontSize: number;
  metaSize: number;
}

export interface PositionedMapNode extends MapNode, NodeSize {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
