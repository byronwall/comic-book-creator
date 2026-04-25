import { getNodeMetadataEntries } from "~/lib/projects/node-metadata";
import type { ProjectRecord } from "~/lib/projects/types";
import type { MapNode, SpatialMapData } from "~/lib/spatial-map/types";

export interface NodeImageGenerationContext {
  projectName: string;
  projectDescription: string;
  projectMetadataSchema: ProjectRecord["nodeMetadataSchema"];
  targetNode: NodeImageContextNode;
  descendantNodes: NodeImageContextNode[];
  relatedNodes: NodeImageContextNode[];
}

export interface NodeImageContextNode {
  id: string;
  label: string;
  type: string;
  depth: number;
  metadata: Array<{ key: string; label: string; value: string }>;
  contextExcerpt: string;
}

const MAX_DESCENDANT_NODES = 18;
const MAX_RELATED_NODES = 8;
const MAX_CONTEXT_EXCERPT_LENGTH = 700;

export function buildNodeImageGenerationContext(input: {
  project: ProjectRecord;
  nodeId: string;
}): NodeImageGenerationContext {
  const targetNode = input.project.spatialMap.nodes.find((node) => node.id === input.nodeId);

  if (!targetNode) {
    throw new Error("Node not found.");
  }

  const descendantIds = getDescendantNodeIds(input.project.spatialMap, input.nodeId);
  const descendantNodes = descendantIds
    .map((nodeId) => input.project.spatialMap.nodes.find((node) => node.id === nodeId))
    .filter((node): node is MapNode => Boolean(node))
    .slice(0, MAX_DESCENDANT_NODES);

  const subtreeIds = new Set([input.nodeId, ...descendantIds]);
  const relatedNodeIds = input.project.spatialMap.links
    .filter((link) => !link.parentChild)
    .flatMap((link) => {
      if (subtreeIds.has(link.source) && !subtreeIds.has(link.target)) return [link.target];
      if (subtreeIds.has(link.target) && !subtreeIds.has(link.source)) return [link.source];
      return [];
    });

  const relatedNodes = [...new Set(relatedNodeIds)]
    .map((nodeId) => input.project.spatialMap.nodes.find((node) => node.id === nodeId))
    .filter((node): node is MapNode => Boolean(node))
    .slice(0, MAX_RELATED_NODES);

  return {
    projectName: input.project.name,
    projectDescription: input.project.description,
    projectMetadataSchema: input.project.nodeMetadataSchema,
    targetNode: summarizeNodeForImageContext(targetNode, input.project),
    descendantNodes: descendantNodes.map((node) => summarizeNodeForImageContext(node, input.project)),
    relatedNodes: relatedNodes.map((node) => summarizeNodeForImageContext(node, input.project)),
  };
}

export function formatNodeImageGenerationContext(context: NodeImageGenerationContext) {
  return [
    `Project: ${context.projectName}`,
    `Description: ${context.projectDescription}`,
    "",
    "Project metadata schema:",
    context.projectMetadataSchema.length > 0
      ? context.projectMetadataSchema
          .map((field) => `- ${field.label} (${field.key}) default: ${field.defaultValue || "(none)"}`)
          .join("\n")
      : "No project metadata fields defined.",
    "",
    "Target node:",
    formatContextNode(context.targetNode),
    "",
    "Child and descendant nodes:",
    context.descendantNodes.length > 0
      ? context.descendantNodes.map(formatContextNode).join("\n")
      : "No child nodes are currently mapped under this node.",
    "",
    "Related nodes outside this subtree:",
    context.relatedNodes.length > 0
      ? context.relatedNodes.map(formatContextNode).join("\n")
      : "No related external nodes found.",
  ].join("\n");
}

function getDescendantNodeIds(data: SpatialMapData, rootNodeId: string) {
  const childrenByParentId = new Map<string, string[]>();
  for (const link of data.links) {
    if (!link.parentChild) continue;

    const children = childrenByParentId.get(link.source) ?? [];
    children.push(link.target);
    childrenByParentId.set(link.source, children);
  }

  const descendants: string[] = [];
  const visited = new Set([rootNodeId]);
  const queue = [...(childrenByParentId.get(rootNodeId) ?? [])];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) continue;

    visited.add(nodeId);
    descendants.push(nodeId);
    queue.push(...(childrenByParentId.get(nodeId) ?? []));
  }

  return descendants;
}

function summarizeNodeForImageContext(
  node: MapNode,
  project: ProjectRecord,
): NodeImageContextNode {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    depth: node.depth,
    metadata: getNodeMetadataEntries(node, project.nodeMetadataSchema),
    contextExcerpt: truncateText(node.context || node.rawContext || "", MAX_CONTEXT_EXCERPT_LENGTH),
  };
}

function formatContextNode(node: NodeImageContextNode) {
  return [
    `- ${node.label} (${node.type}, depth ${node.depth}, id ${node.id})`,
    ...(node.metadata.length > 0
      ? node.metadata.map((entry) => `  ${entry.label}: ${entry.value}`)
      : ["  Metadata: none"]),
    node.contextExcerpt ? `  Context: ${node.contextExcerpt}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function truncateText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1)}…`;
}
