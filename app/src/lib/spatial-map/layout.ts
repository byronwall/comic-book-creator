import type { PositionedMapNode, SpatialMapData, NodeSize } from "./types";
import { alignLayoutBorders } from "./border-alignment";

export const VIEWPORT_WIDTH = 1600;
export const VIEWPORT_HEIGHT = 960;
export const VIEWPORT_CENTER_X = VIEWPORT_WIDTH / 2;
export const VIEWPORT_CENTER_Y = VIEWPORT_HEIGHT / 2;

const sizeByDepth: Record<
  number,
  Omit<NodeSize, "width" | "height"> & { area: number; minWidth: number; maxWidth: number }
> = {
  0: { area: 20_240, minWidth: 184, maxWidth: 252, fontSize: 22, metaSize: 12 },
  1: { area: 12_580, minWidth: 148, maxWidth: 212, fontSize: 16, metaSize: 11 },
  2: { area: 6_960, minWidth: 112, maxWidth: 164, fontSize: 16, metaSize: 10 },
};
const SHALLOW_VISIBLE_DEPTH_SCALE = 1.32;
const DEEP_VISIBLE_DEPTH_SCALE = 0.8;

export type AdjacencyMap = Map<string, Set<string>>;

export function getNodeSize(depth: number, label = ""): NodeSize {
  const base = sizeByDepth[depth] ?? sizeByDepth[2];
  const labelLength = label.trim().length;
  const aspect = clamp(1.55 + (labelLength - 10) * 0.055, 1.35, 2.2);
  const rawWidth = Math.sqrt(base.area * aspect);
  const width = clamp(Math.round(rawWidth / 2) * 2, base.minWidth, base.maxWidth);
  const height = Math.max(48, Math.round((base.area / width) / 2) * 2);

  return {
    width,
    height,
    fontSize: base.fontSize,
    metaSize: base.metaSize,
  };
}

export function buildAdjacencyMap(data: SpatialMapData): AdjacencyMap {
  const adjacency = new Map<string, Set<string>>();
  for (const node of data.nodes) {
    adjacency.set(node.id, new Set());
  }

  for (const link of data.links) {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source);
  }

  return adjacency;
}

export function createInitialLayout(data: SpatialMapData): PositionedMapNode[] {
  const adjacency = buildAdjacencyMap(data);
  const visibleDepthRange = getVisibleDepthRange(data.nodes);
  const positionedNodes = data.nodes.map((node) => ({
    ...node,
    ...getVisibleDepthNodeSize(node.depth, node.label, visibleDepthRange),
    x: VIEWPORT_CENTER_X,
    y: VIEWPORT_CENTER_Y,
    vx: 0,
    vy: 0,
  }));

  return resetLayout(positionedNodes, adjacency);
}

function getVisibleDepthNodeSize(
  depth: number,
  label: string,
  visibleDepthRange: { minDepth: number; maxDepth: number },
): NodeSize {
  const baseSize = getNodeSize(depth, label);
  const relativeDepth = getRelativeDepth(depth, visibleDepthRange);
  if (relativeDepth === null) {
    return baseSize;
  }

  const scale = interpolateNumber(
    SHALLOW_VISIBLE_DEPTH_SCALE,
    DEEP_VISIBLE_DEPTH_SCALE,
    relativeDepth,
  );

  return {
    width: roundEven(Math.max(48, baseSize.width * scale)),
    height: roundEven(Math.max(48, baseSize.height * scale)),
    fontSize: Math.max(10, Math.round(baseSize.fontSize * scale * 10) / 10),
    metaSize: Math.max(9, Math.round(baseSize.metaSize * scale * 10) / 10),
  };
}

function getVisibleDepthRange(nodes: { depth: number }[]) {
  if (nodes.length === 0) {
    return { minDepth: 0, maxDepth: 0 };
  }

  let minDepth = Number.POSITIVE_INFINITY;
  let maxDepth = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    minDepth = Math.min(minDepth, node.depth);
    maxDepth = Math.max(maxDepth, node.depth);
  }

  return { minDepth, maxDepth };
}

function getRelativeDepth(
  depth: number,
  range: { minDepth: number; maxDepth: number },
) {
  const span = range.maxDepth - range.minDepth;
  if (span <= 0) {
    return null;
  }

  return (depth - range.minDepth) / span;
}

function interpolateNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function roundEven(value: number) {
  return Math.max(2, Math.round(value / 2) * 2);
}

export function filterSpatialMapDataByRelatedNodes(
  data: SpatialMapData,
  coreId: string | null,
  maxDistance = 2,
): SpatialMapData {
  if (!coreId) {
    return data;
  }

  const adjacency = buildAdjacencyMap(data);
  const visibleNodeIds = getRelatedSet(adjacency, coreId, maxDistance);

  return {
    nodes: data.nodes.filter((node) => visibleNodeIds.has(node.id)),
    links: data.links.filter(
      (link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target),
    ),
  };
}

export function filterSpatialMapDataForIsolation(
  data: SpatialMapData,
  coreId: string | null,
  options: { includeLinked?: boolean; maxLinkedDistance?: number } = {},
): SpatialMapData {
  if (!coreId) {
    return data;
  }

  const visibleNodeIds = getIsolationContinuitySet(data, coreId);

  if (options.includeLinked) {
    const adjacency = buildAdjacencyMap(data);
    for (const nodeId of getRelatedSet(adjacency, coreId, options.maxLinkedDistance)) {
      visibleNodeIds.add(nodeId);
    }
  }

  return {
    nodes: data.nodes.filter((node) => visibleNodeIds.has(node.id)),
    links: data.links.filter(
      (link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target),
    ),
  };
}

export function resetLayout(
  nodes: PositionedMapNode[],
  adjacency: AdjacencyMap,
): PositionedMapNode[] {
  const nextNodes = nodes.map((node) => ({
    ...node,
    vx: 0,
    vy: 0,
  }));
  const nodesById = new Map(nextNodes.map((node) => [node.id, node]));

  const pages = nextNodes.filter((node) => node.depth === 0);
  const pageRadius = 280;
  pages.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(pages.length, 1)) * Math.PI * 2;
    node.x = VIEWPORT_CENTER_X + Math.cos(angle) * pageRadius;
    node.y = VIEWPORT_CENTER_Y + Math.sin(angle) * pageRadius;
  });

  const assemblies = nextNodes.filter((node) => node.depth === 1);
  assemblies.forEach((node, index) => {
    const parentId = [...(adjacency.get(node.id) ?? [])].find((id) => {
      return nodesById.get(id)?.depth === 0;
    });
    const parent = parentId ? nodesById.get(parentId) : undefined;
    const angle = (index % 5) * (Math.PI / 2.5);
    node.x = (parent?.x ?? VIEWPORT_CENTER_X) + Math.cos(angle) * 150;
    node.y = (parent?.y ?? VIEWPORT_CENTER_Y) + Math.sin(angle) * 110;
  });

  const components = nextNodes.filter((node) => node.depth >= 2);
  components.forEach((node, index) => {
    const parentId = [...(adjacency.get(node.id) ?? [])].find((id) => {
      return nodesById.get(id)?.depth === 1;
    });
    const parent = parentId ? nodesById.get(parentId) : undefined;
    const angle = (index % 6) * (Math.PI / 3);
    node.x = (parent?.x ?? VIEWPORT_CENTER_X) + Math.cos(angle) * 110;
    node.y = (parent?.y ?? VIEWPORT_CENTER_Y) + Math.sin(angle) * 80;
  });

  return solveStaticLayout(nextNodes, adjacency);
}

export function getRelatedSet(
  adjacency: AdjacencyMap,
  coreId: string | null,
  maxDistance = 2,
): Set<string> {
  if (!coreId) {
    return new Set();
  }

  const related = new Set([coreId]);
  const queue = [{ id: coreId, distance: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.distance >= maxDistance) {
      continue;
    }

    for (const neighborId of adjacency.get(current.id) ?? []) {
      if (related.has(neighborId)) {
        continue;
      }

      related.add(neighborId);
      queue.push({ id: neighborId, distance: current.distance + 1 });
    }
  }

  return related;
}

export function getDescendantSet(data: SpatialMapData, coreId: string | null): Set<string> {
  if (!coreId) {
    return new Set();
  }

  const { childrenByParentId } = buildHierarchyIndex(data);
  const descendants = new Set([coreId]);
  const queue = [coreId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    for (const childId of childrenByParentId.get(currentId) ?? []) {
      if (descendants.has(childId)) {
        continue;
      }

      descendants.add(childId);
      queue.push(childId);
    }
  }

  return descendants;
}

export function getIsolationContinuitySet(
  data: SpatialMapData,
  coreId: string | null,
): Set<string> {
  if (!coreId) {
    return new Set();
  }

  const { childrenByParentId, parentsByChildId } = buildHierarchyIndex(data);
  const visibleNodeIds = new Set([coreId]);
  const descendantQueue = [coreId];
  const ancestorQueue = [coreId];

  while (descendantQueue.length > 0) {
    const currentId = descendantQueue.shift();
    if (!currentId) {
      continue;
    }

    for (const childId of childrenByParentId.get(currentId) ?? []) {
      if (visibleNodeIds.has(childId)) {
        continue;
      }

      visibleNodeIds.add(childId);
      descendantQueue.push(childId);
    }
  }

  while (ancestorQueue.length > 0) {
    const currentId = ancestorQueue.shift();
    if (!currentId) {
      continue;
    }

    for (const parentId of parentsByChildId.get(currentId) ?? []) {
      if (visibleNodeIds.has(parentId)) {
        continue;
      }

      visibleNodeIds.add(parentId);
      ancestorQueue.push(parentId);
    }
  }

  return visibleNodeIds;
}

function buildHierarchyIndex(data: SpatialMapData) {
  const childrenByParentId = new Map<string, Set<string>>();
  const parentsByChildId = new Map<string, Set<string>>();

  for (const link of data.links) {
    if (!link.parentChild) {
      continue;
    }

    const children = childrenByParentId.get(link.source) ?? new Set<string>();
    children.add(link.target);
    childrenByParentId.set(link.source, children);

    const parents = parentsByChildId.get(link.target) ?? new Set<string>();
    parents.add(link.source);
    parentsByChildId.set(link.target, parents);
  }

  return { childrenByParentId, parentsByChildId };
}

export function stepLayout(
  nodes: PositionedMapNode[],
  adjacency: AdjacencyMap,
  hoveredNodeId: string | null,
): PositionedMapNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const nodesById = new Map(nextNodes.map((node) => [node.id, node]));

  nudgeHoveredCluster(nextNodes, nodesById, adjacency, hoveredNodeId);

  for (const node of nextNodes) {
    const dx = node.x - VIEWPORT_CENTER_X;
    const dy = node.y - VIEWPORT_CENTER_Y;
    const distance = Math.hypot(dx, dy) || 1;
    const targetRadius = node.depth === 0 ? 300 : node.depth === 1 ? 180 : 72;
    const radialError = distance - targetRadius;
    const radialStrength =
      node.depth === 0 ? 0.0015 : node.depth === 1 ? 0.0012 : 0.0009;

    node.vx += -(dx / distance) * radialError * radialStrength;
    node.vy += -(dy / distance) * radialError * radialStrength;
  }

  for (const [sourceId, neighbors] of adjacency) {
    for (const targetId of neighbors) {
      if (sourceId > targetId) {
        continue;
      }

      const source = nodesById.get(sourceId);
      const target = nodesById.get(targetId);
      if (!source || !target) {
        continue;
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.hypot(dx, dy) || 0.001;
      const touchDistance =
        (Math.max(source.width, source.height) + Math.max(target.width, target.height)) *
        0.52;
      const force = (distance - touchDistance) * 0.0045;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  for (let i = 0; i < nextNodes.length; i += 1) {
    for (let j = i + 1; j < nextNodes.length; j += 1) {
      const a = nextNodes[i];
      const b = nextNodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const overlapX = getAxisOverlap(a.x, a.width, b.x, b.width);
      const overlapY = getAxisOverlap(a.y, a.height, b.y, b.height);

      if (overlapX <= 0 || overlapY <= 0) {
        continue;
      }

      if (overlapX < overlapY) {
        const push = overlapX * 0.12 * Math.sign(dx || 1);
        a.vx -= push;
        b.vx += push;
      } else {
        const push = overlapY * 0.12 * Math.sign(dy || 1);
        a.vy -= push;
        b.vy += push;
      }
    }
  }

  for (const node of nextNodes) {
    const neighbors = [...(adjacency.get(node.id) ?? [])]
      .map((id) => nodesById.get(id))
      .filter((item): item is PositionedMapNode => Boolean(item));

    if (neighbors.length > 0) {
      const avgX =
        neighbors.reduce((sum, neighbor) => sum + neighbor.x, 0) / neighbors.length;
      const avgY =
        neighbors.reduce((sum, neighbor) => sum + neighbor.y, 0) / neighbors.length;
      node.vx += (avgX - node.x) * 0.0008;
      node.vy += (avgY - node.y) * 0.0008;
    }

    node.vx *= 0.88;
    node.vy *= 0.88;
    node.x = clamp(node.x + node.vx, node.width / 2 + 28, VIEWPORT_WIDTH - node.width / 2 - 28);
    node.y = clamp(
      node.y + node.vy,
      node.height / 2 + 28,
      VIEWPORT_HEIGHT - node.height / 2 - 28,
    );
  }

  return nextNodes;
}

export function solveStaticLayout(
  nodes: PositionedMapNode[],
  adjacency: AdjacencyMap,
): PositionedMapNode[] {
  let nextNodes = nodes.map((node) => ({ ...node, vx: 0, vy: 0 }));

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const previous = nextNodes;
    nextNodes = stepLayout(nextNodes, adjacency, null);

    const movement = nextNodes.reduce((total, node, index) => {
      const prior = previous[index];
      return total + Math.hypot(node.x - prior.x, node.y - prior.y);
    }, 0);

    if (movement < 0.35) {
      break;
    }
  }

  nextNodes = consolidateLayout(nextNodes, adjacency);
  nextNodes = packLayout(nextNodes, adjacency);
  nextNodes = sealLayout(nextNodes, adjacency);
  nextNodes = rebalanceLayoutAspect(nextNodes);
  nextNodes = sealLayout(nextNodes, adjacency);
  nextNodes = snapLayoutToGrid(nextNodes, 4);
  nextNodes = resolveOverlaps(nextNodes);
  nextNodes = sealLayout(nextNodes, adjacency);
  nextNodes = alignLayoutBorders(nextNodes, adjacency);
  nextNodes = recenterLayout(nextNodes, 20);
  nextNodes = resolveOverlaps(nextNodes);

  return nextNodes.map((node) => ({ ...node, vx: 0, vy: 0 }));
}

function nudgeHoveredCluster(
  nodes: PositionedMapNode[],
  nodesById: Map<string, PositionedMapNode>,
  adjacency: AdjacencyMap,
  hoveredNodeId: string | null,
) {
  if (!hoveredNodeId) {
    return;
  }

  const core = nodesById.get(hoveredNodeId);
  if (!core) {
    return;
  }

  const directNeighbors = [...(adjacency.get(core.id) ?? [])]
    .map((id) => nodesById.get(id))
    .filter((item): item is PositionedMapNode => Boolean(item));

  if (directNeighbors.length === 0) {
    return;
  }

  const clusterNodes = [core, ...directNeighbors];
  const clusterCenterX =
    clusterNodes.reduce((sum, node) => sum + node.x, 0) / clusterNodes.length;
  const clusterCenterY =
    clusterNodes.reduce((sum, node) => sum + node.y, 0) / clusterNodes.length;
  const touchingThreshold = 170;

  for (const node of directNeighbors) {
    const dx = node.x - clusterCenterX;
    const dy = node.y - clusterCenterY;
    const distance = Math.hypot(dx, dy) || 0.001;

    if (distance <= touchingThreshold) {
      continue;
    }

    const pull = (distance - touchingThreshold) * 0.012;
    node.vx += -(dx / distance) * pull;
    node.vy += -(dy / distance) * pull;
  }
}

function consolidateLayout(
  nodes: PositionedMapNode[],
  adjacency: AdjacencyMap,
): PositionedMapNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const nodesById = new Map(nextNodes.map((node) => [node.id, node]));

  for (let pass = 0; pass < 24; pass += 1) {
    const sortedNodes = [...nextNodes].sort((left, right) => {
      const leftDistance = Math.hypot(left.x - VIEWPORT_CENTER_X, left.y - VIEWPORT_CENTER_Y);
      const rightDistance = Math.hypot(right.x - VIEWPORT_CENTER_X, right.y - VIEWPORT_CENTER_Y);
      return leftDistance - rightDistance;
    });

    for (const node of sortedNodes) {
      const neighbors = [...(adjacency.get(node.id) ?? [])]
        .map((id) => nodesById.get(id))
        .filter((item): item is PositionedMapNode => Boolean(item));

      if (neighbors.length === 0) {
        compactNodeTowardsTarget(nextNodes, node, VIEWPORT_CENTER_X, VIEWPORT_CENTER_Y);
        continue;
      }

      const targetX =
        neighbors.reduce((sum, neighbor) => sum + neighbor.x, 0) / neighbors.length;
      const targetY =
        neighbors.reduce((sum, neighbor) => sum + neighbor.y, 0) / neighbors.length;

      compactNodeTowardsTarget(nextNodes, node, targetX, targetY);
    }
  }

  return nextNodes;
}

function compactNodeTowardsTarget(
  nodes: PositionedMapNode[],
  node: PositionedMapNode,
  targetX: number,
  targetY: number,
) {
  const dx = targetX - node.x;
  const dy = targetY - node.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    moveNodeAlongAxis(nodes, node, "x", dx);
    moveNodeAlongAxis(nodes, node, "y", dy * 0.35);
  } else {
    moveNodeAlongAxis(nodes, node, "y", dy);
    moveNodeAlongAxis(nodes, node, "x", dx * 0.35);
  }
}

function moveNodeAlongAxis(
  nodes: PositionedMapNode[],
  node: PositionedMapNode,
  axis: "x" | "y",
  delta: number,
) {
  if (Math.abs(delta) < 0.5) {
    return;
  }

  const direction = Math.sign(delta);
  const maxDistance = Math.abs(delta);
  let low = 0;
  let high = maxDistance;
  let best = 0;

  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    const candidate =
      axis === "x"
        ? { x: node.x + direction * mid, y: node.y }
        : { x: node.x, y: node.y + direction * mid };

    if (wouldOverlapAtPosition(nodes, node, candidate.x, candidate.y)) {
      high = mid;
    } else {
      best = mid;
      low = mid;
    }
  }

  if (axis === "x") {
    node.x = clamp(
      node.x + direction * best,
      node.width / 2,
      VIEWPORT_WIDTH - node.width / 2,
    );
  } else {
    node.y = clamp(
      node.y + direction * best,
      node.height / 2,
      VIEWPORT_HEIGHT - node.height / 2,
    );
  }
}

function wouldOverlapAtPosition(
  nodes: PositionedMapNode[],
  currentNode: PositionedMapNode,
  x: number,
  y: number,
) {
  return nodes.some((other) => {
    if (other.id === currentNode.id) {
      return false;
    }

    return rectanglesOverlap(
      x,
      y,
      currentNode.width,
      currentNode.height,
      other.x,
      other.y,
      other.width,
      other.height,
    );
  });
}

function rectanglesOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return (
    getAxisOverlap(ax, aw, bx, bw) > 0 &&
    getAxisOverlap(ay, ah, by, bh) > 0
  );
}

function getAxisOverlap(
  aCenter: number,
  aSize: number,
  bCenter: number,
  bSize: number,
) {
  return (aSize + bSize) / 2 - Math.abs(aCenter - bCenter);
}

function resolveOverlaps(nodes: PositionedMapNode[]) {
  const nextNodes = nodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < 8; pass += 1) {
    let movedOnPass = false;

    for (const node of nextNodes) {
      if (!wouldOverlapAtPosition(nextNodes, node, node.x, node.y)) {
        continue;
      }

      const openPosition = findNearestOpenPosition(nextNodes, node, 4);
      if (!openPosition) {
        continue;
      }

      node.x = openPosition.x;
      node.y = openPosition.y;
      movedOnPass = true;
    }

    if (!movedOnPass) {
      break;
    }
  }

  return nextNodes;
}

function packLayout(
  nodes: PositionedMapNode[],
  adjacency: AdjacencyMap,
): PositionedMapNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const placedNodes: PositionedMapNode[] = [];
  const placedById = new Map<string, PositionedMapNode>();
  const horizontalGap = 0;
  const verticalGap = 0;
  const margin = 20;
  const orderedNodes = [...nextNodes].sort((left, right) => {
    const depthDiff = left.depth - right.depth;
    if (depthDiff !== 0) {
      return depthDiff;
    }

    const degreeDiff =
      (adjacency.get(right.id)?.size ?? 0) - (adjacency.get(left.id)?.size ?? 0);
    if (degreeDiff !== 0) {
      return degreeDiff;
    }

    return right.width * right.height - left.width * left.height;
  });

  for (const node of orderedNodes) {
    const target = getPackingTarget(node, adjacency, placedById);
    const candidate = findBestPackedPosition(
      placedNodes,
      node,
      target,
      horizontalGap,
      verticalGap,
      margin,
    );
    node.x = candidate.x;
    node.y = candidate.y;
    placedNodes.push(node);
    placedById.set(node.id, node);
  }

  return recenterLayout(nextNodes, margin);
}

function sealLayout(
  nodes: PositionedMapNode[],
  adjacency: AdjacencyMap,
): PositionedMapNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const nodesById = new Map(nextNodes.map((node) => [node.id, node]));

  for (let pass = 0; pass < 18; pass += 1) {
    const orderedNodes = [...nextNodes].sort((left, right) => {
      const leftDistance = Math.hypot(left.x - VIEWPORT_CENTER_X, left.y - VIEWPORT_CENTER_Y);
      const rightDistance = Math.hypot(right.x - VIEWPORT_CENTER_X, right.y - VIEWPORT_CENTER_Y);
      return rightDistance - leftDistance;
    });

    for (const node of orderedNodes) {
      const neighbors = [...(adjacency.get(node.id) ?? [])]
        .map((id) => nodesById.get(id))
        .filter((item): item is PositionedMapNode => Boolean(item));

      if (neighbors.length === 0) {
        compactNodeTowardsTarget(nextNodes, node, VIEWPORT_CENTER_X, VIEWPORT_CENTER_Y);
        continue;
      }

      const targetX =
        neighbors.reduce((sum, neighbor) => sum + neighbor.x, 0) / neighbors.length;
      const targetY =
        neighbors.reduce((sum, neighbor) => sum + neighbor.y, 0) / neighbors.length;

      compactNodeTowardsTarget(nextNodes, node, targetX, targetY);
    }
  }

  return nextNodes;
}

function getPackingTarget(
  node: PositionedMapNode,
  adjacency: AdjacencyMap,
  placedById: Map<string, PositionedMapNode>,
) {
  const neighbors = [...(adjacency.get(node.id) ?? [])]
    .map((id) => placedById.get(id))
    .filter((item): item is PositionedMapNode => Boolean(item));

  if (neighbors.length === 0) {
    return { x: node.x, y: node.y };
  }

  const averageX = neighbors.reduce((sum, neighbor) => sum + neighbor.x, 0) / neighbors.length;
  const averageY = neighbors.reduce((sum, neighbor) => sum + neighbor.y, 0) / neighbors.length;

  return {
    x: node.x * 0.25 + averageX * 0.75,
    y: node.y * 0.25 + averageY * 0.75,
  };
}

function findBestPackedPosition(
  placedNodes: PositionedMapNode[],
  node: PositionedMapNode,
  target: { x: number; y: number },
  horizontalGap: number,
  verticalGap: number,
  margin: number,
) {
  if (placedNodes.length === 0) {
    return clampPosition(node, target.x, target.y, margin);
  }

  const candidates = new Map<string, { x: number; y: number }>();
  const addCandidate = (x: number, y: number) => {
    const clamped = clampPosition(node, x, y, margin);
    candidates.set(`${clamped.x}:${clamped.y}`, clamped);
  };

  addCandidate(target.x, target.y);

  for (const placed of placedNodes) {
    addCandidate(
      placed.x + (placed.width + node.width) / 2 + horizontalGap,
      placed.y,
    );
    addCandidate(
      placed.x - (placed.width + node.width) / 2 - horizontalGap,
      placed.y,
    );
    addCandidate(
      placed.x,
      placed.y + (placed.height + node.height) / 2 + verticalGap,
    );
    addCandidate(
      placed.x,
      placed.y - (placed.height + node.height) / 2 - verticalGap,
    );
    addCandidate(
      placed.x + (placed.width + node.width) / 2 + horizontalGap,
      placed.y + (placed.height + node.height) / 2 + verticalGap,
    );
    addCandidate(
      placed.x - (placed.width + node.width) / 2 - horizontalGap,
      placed.y + (placed.height + node.height) / 2 + verticalGap,
    );
    addCandidate(
      placed.x + (placed.width + node.width) / 2 + horizontalGap,
      placed.y - (placed.height + node.height) / 2 - verticalGap,
    );
    addCandidate(
      placed.x - (placed.width + node.width) / 2 - horizontalGap,
      placed.y - (placed.height + node.height) / 2 - verticalGap,
    );
  }

  let bestCandidate: { x: number; y: number; score: number } | null = null;

  for (const candidate of candidates.values()) {
    if (wouldOverlapAtPosition(placedNodes, node, candidate.x, candidate.y)) {
      continue;
    }

    const score = scorePackedCandidate(placedNodes, node, candidate, target);
    if (!bestCandidate || score < bestCandidate.score) {
      bestCandidate = { ...candidate, score };
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  const fallback = findNearestOpenPositionFromTarget(placedNodes, node, target, 6, margin);
  if (fallback) {
    return fallback;
  }

  return clampPosition(node, target.x, target.y, margin);
}

function scorePackedCandidate(
  placedNodes: PositionedMapNode[],
  node: PositionedMapNode,
  candidate: { x: number; y: number },
  target: { x: number; y: number },
) {
  const distanceToTarget = Math.hypot(candidate.x - target.x, candidate.y - target.y);
  const bounds = getLayoutBounds([
    ...placedNodes,
    {
      ...node,
      x: candidate.x,
      y: candidate.y,
    },
  ]);
  const nodeArea =
    node.width * node.height +
    placedNodes.reduce((total, placed) => total + placed.width * placed.height, 0);
  const area = bounds.width * bounds.height;
  const perimeter = bounds.width + bounds.height;
  const desiredAspect = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
  const aspect = bounds.width / Math.max(bounds.height, 1);
  const aspectError = Math.log(aspect / desiredAspect);
  const aspectPenalty = Math.abs(aspectError) * 660 + Math.max(0, -aspectError) * 520;
  const contact = measureSharedBorder(placedNodes, node, candidate);
  const targetBlobArea = nodeArea / 0.72;
  const sparsePenalty = Math.max(0, area / targetBlobArea - 1) * 120;

  return (
    distanceToTarget * 0.22 +
    area * 0.0007 +
    perimeter * 0.018 +
    aspectPenalty +
    sparsePenalty -
    contact.sharedBorder * 5 -
    contact.touchingNeighbors * 80
  );
}

function measureSharedBorder(
  placedNodes: PositionedMapNode[],
  node: PositionedMapNode,
  candidate: { x: number; y: number },
) {
  let sharedBorder = 0;
  let touchingNeighbors = 0;
  const tolerance = 0.5;

  for (const placed of placedNodes) {
    const overlapX = getAxisOverlap(candidate.x, node.width, placed.x, placed.width);
    const overlapY = getAxisOverlap(candidate.y, node.height, placed.y, placed.height);

    const sharesVerticalBorder =
      Math.abs(overlapX) <= tolerance && overlapY > 0;
    const sharesHorizontalBorder =
      Math.abs(overlapY) <= tolerance && overlapX > 0;

    if (sharesVerticalBorder) {
      sharedBorder += Math.min(
        candidate.y + node.height / 2,
        placed.y + placed.height / 2,
      ) - Math.max(candidate.y - node.height / 2, placed.y - placed.height / 2);
      touchingNeighbors += 1;
      continue;
    }

    if (sharesHorizontalBorder) {
      sharedBorder += Math.min(
        candidate.x + node.width / 2,
        placed.x + placed.width / 2,
      ) - Math.max(candidate.x - node.width / 2, placed.x - placed.width / 2);
      touchingNeighbors += 1;
    }
  }

  return { sharedBorder, touchingNeighbors };
}

function findNearestOpenPositionFromTarget(
  placedNodes: PositionedMapNode[],
  node: PositionedMapNode,
  target: { x: number; y: number },
  step: number,
  margin: number,
) {
  const origin = clampPosition(node, target.x, target.y, margin);
  const maxRadius = Math.ceil(Math.max(VIEWPORT_WIDTH, VIEWPORT_HEIGHT) / step);

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    let bestCandidate: { x: number; y: number; score: number } | null = null;

    for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
      const yMagnitude = radius - Math.abs(xOffset);
      const yOffsets = yMagnitude === 0 ? [0] : [-yMagnitude, yMagnitude];

      for (const yOffset of yOffsets) {
        const candidate = clampPosition(
          node,
          origin.x + xOffset * step,
          origin.y + yOffset * step,
          margin,
        );
        if (wouldOverlapAtPosition(placedNodes, node, candidate.x, candidate.y)) {
          continue;
        }

        const score = scorePackedCandidate(placedNodes, node, candidate, target);
        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = { ...candidate, score };
        }
      }
    }

    if (bestCandidate) {
      return bestCandidate;
    }
  }

  return null;
}

function clampPosition(
  node: PositionedMapNode,
  x: number,
  y: number,
  margin: number,
) {
  return {
    x: clamp(x, node.width / 2 + margin, VIEWPORT_WIDTH - node.width / 2 - margin),
    y: clamp(y, node.height / 2 + margin, VIEWPORT_HEIGHT - node.height / 2 - margin),
  };
}

function recenterLayout(nodes: PositionedMapNode[], margin: number) {
  const bounds = getLayoutBounds(nodes);
  const offsetX = VIEWPORT_CENTER_X - (bounds.minX + bounds.maxX) / 2;
  const offsetY = VIEWPORT_CENTER_Y - (bounds.minY + bounds.maxY) / 2;

  return nodes.map((node) => {
    const position = clampPosition(node, node.x + offsetX, node.y + offsetY, margin);
    return {
      ...node,
      x: position.x,
      y: position.y,
    };
  });
}

function rebalanceLayoutAspect(nodes: PositionedMapNode[]) {
  const desiredAspect = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
  const bounds = getLayoutBounds(nodes);
  const currentAspect = bounds.width / Math.max(bounds.height, 1);
  const ratio = desiredAspect / Math.max(currentAspect, 0.001);

  if (Math.abs(Math.log(ratio)) < 0.08) {
    return nodes;
  }

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const stretch = clamp(Math.sqrt(ratio), 0.82, 1.35);
  const squeeze = clamp(1 / stretch, 0.8, 1.22);

  return nodes.map((node) => {
    const position = clampPosition(
      node,
      centerX + (node.x - centerX) * stretch,
      centerY + (node.y - centerY) * squeeze,
      20,
    );

    return {
      ...node,
      x: position.x,
      y: position.y,
    };
  });
}

function getLayoutBounds(nodes: PositionedMapNode[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.width / 2);
    minY = Math.min(minY, node.y - node.height / 2);
    maxX = Math.max(maxX, node.x + node.width / 2);
    maxY = Math.max(maxY, node.y + node.height / 2);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function findNearestOpenPosition(
  nodes: PositionedMapNode[],
  node: PositionedMapNode,
  step: number,
) {
  const originX = node.x;
  const originY = node.y;
  const maxRadius = Math.ceil(Math.max(VIEWPORT_WIDTH, VIEWPORT_HEIGHT) / step);

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    let bestCandidate: { x: number; y: number; score: number } | null = null;

    for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
      const yMagnitude = radius - Math.abs(xOffset);
      const yOffsets = yMagnitude === 0 ? [0] : [-yMagnitude, yMagnitude];

      for (const yOffset of yOffsets) {
        const candidateX = clamp(
          originX + xOffset * step,
          node.width / 2,
          VIEWPORT_WIDTH - node.width / 2,
        );
        const candidateY = clamp(
          originY + yOffset * step,
          node.height / 2,
          VIEWPORT_HEIGHT - node.height / 2,
        );

        if (wouldOverlapAtPosition(nodes, node, candidateX, candidateY)) {
          continue;
        }

        const score = Math.hypot(candidateX - originX, candidateY - originY);
        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = { x: candidateX, y: candidateY, score };
        }
      }
    }

    if (bestCandidate) {
      return bestCandidate;
    }
  }

  return null;
}

function snapLayoutToGrid(nodes: PositionedMapNode[], step: number) {
  return nodes.map((node) => ({
    ...node,
    x: Math.round(node.x / step) * step,
    y: Math.round(node.y / step) * step,
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
