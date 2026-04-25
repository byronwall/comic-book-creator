import type { AdjacencyMap } from "./layout";
import type { PositionedMapNode } from "./types";

type BorderAlignment =
  | { axis: "x"; gap: number; sourceDirection: 1 | -1 }
  | { axis: "y"; gap: number; sourceDirection: 1 | -1 };

type NodeMove = {
  node: PositionedMapNode;
  dx: number;
  dy: number;
};

type LayoutCenter = {
  x: number;
  y: number;
};

export function alignLayoutBorders(
  nodes: PositionedMapNode[],
  adjacency: AdjacencyMap,
): PositionedMapNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const maxGap = 24;
  const minSharedSpan = 8;

  for (let pass = 0; pass < 8; pass += 1) {
    const nodesById = new Map(nextNodes.map((node) => [node.id, node]));
    const pairs = getBorderAlignmentPairs(nextNodes, adjacency);
    const center = getNodeCenter(nextNodes);
    let movedOnPass = false;

    for (const [sourceId, targetId] of pairs) {
      const source = nodesById.get(sourceId);
      const target = nodesById.get(targetId);
      if (!source || !target) {
        continue;
      }

      const alignment = getClosestBorderAlignment(source, target, maxGap, minSharedSpan);
      if (!alignment) {
        continue;
      }

      if (applyBorderAlignment(nextNodes, source, target, alignment, center)) {
        movedOnPass = true;
      }
    }

    if (!movedOnPass) {
      break;
    }
  }

  return nextNodes;
}

function getBorderAlignmentPairs(nodes: PositionedMapNode[], adjacency: AdjacencyMap) {
  const pairs: [string, string][] = [];
  const seenPairs = new Set<string>();
  const addPair = (sourceId: string, targetId: string) => {
    const [leftId, rightId] =
      sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
    const key = `${leftId}:${rightId}`;

    if (seenPairs.has(key)) {
      return;
    }

    seenPairs.add(key);
    pairs.push([leftId, rightId]);
  };

  for (const [sourceId, neighbors] of adjacency) {
    for (const targetId of neighbors) {
      addPair(sourceId, targetId);
    }
  }

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      addPair(nodes[i].id, nodes[j].id);
    }
  }

  return pairs;
}

function getClosestBorderAlignment(
  source: PositionedMapNode,
  target: PositionedMapNode,
  maxGap: number,
  minSharedSpan: number,
): BorderAlignment | null {
  const sourceLeft = source.x - source.width / 2;
  const sourceRight = source.x + source.width / 2;
  const sourceTop = source.y - source.height / 2;
  const sourceBottom = source.y + source.height / 2;
  const targetLeft = target.x - target.width / 2;
  const targetRight = target.x + target.width / 2;
  const targetTop = target.y - target.height / 2;
  const targetBottom = target.y + target.height / 2;
  const verticalSpan =
    Math.min(sourceBottom, targetBottom) - Math.max(sourceTop, targetTop);
  const horizontalSpan =
    Math.min(sourceRight, targetRight) - Math.max(sourceLeft, targetLeft);
  const candidates: BorderAlignment[] = [];

  if (verticalSpan >= minSharedSpan) {
    const sourceRightToTargetLeft = targetLeft - sourceRight;
    if (sourceRightToTargetLeft > 0 && sourceRightToTargetLeft <= maxGap) {
      candidates.push({ axis: "x", gap: sourceRightToTargetLeft, sourceDirection: 1 });
    }

    const targetRightToSourceLeft = sourceLeft - targetRight;
    if (targetRightToSourceLeft > 0 && targetRightToSourceLeft <= maxGap) {
      candidates.push({ axis: "x", gap: targetRightToSourceLeft, sourceDirection: -1 });
    }
  }

  if (horizontalSpan >= minSharedSpan) {
    const sourceBottomToTargetTop = targetTop - sourceBottom;
    if (sourceBottomToTargetTop > 0 && sourceBottomToTargetTop <= maxGap) {
      candidates.push({ axis: "y", gap: sourceBottomToTargetTop, sourceDirection: 1 });
    }

    const targetBottomToSourceTop = sourceTop - targetBottom;
    if (targetBottomToSourceTop > 0 && targetBottomToSourceTop <= maxGap) {
      candidates.push({ axis: "y", gap: targetBottomToSourceTop, sourceDirection: -1 });
    }
  }

  return candidates.sort((left, right) => left.gap - right.gap)[0] ?? null;
}

function applyBorderAlignment(
  nodes: PositionedMapNode[],
  source: PositionedMapNode,
  target: PositionedMapNode,
  alignment: BorderAlignment,
  center: LayoutCenter,
) {
  const candidateMoves = getBorderAlignmentCandidateMoves(
    source,
    target,
    alignment,
    center,
  );

  for (const moves of candidateMoves) {
    if (wouldOverlapWithCandidateMoves(nodes, moves)) {
      continue;
    }

    for (const move of moves) {
      if (alignment.axis === "x") {
        move.node.x += move.dx;
      } else {
        move.node.y += move.dy;
      }
    }

    return true;
  }

  return false;
}

function getBorderAlignmentCandidateMoves(
  source: PositionedMapNode,
  target: PositionedMapNode,
  alignment: BorderAlignment,
  center: LayoutCenter,
) {
  const sourceDistance = Math.hypot(source.x - center.x, source.y - center.y);
  const targetDistance = Math.hypot(target.x - center.x, target.y - center.y);
  const direction = alignment.sourceDirection;
  const sourceMove = {
    node: source,
    dx: alignment.axis === "x" ? direction * alignment.gap : 0,
    dy: alignment.axis === "y" ? direction * alignment.gap : 0,
  };
  const targetMove = {
    node: target,
    dx: alignment.axis === "x" ? -direction * alignment.gap : 0,
    dy: alignment.axis === "y" ? -direction * alignment.gap : 0,
  };
  const splitMoves = [
    {
      node: source,
      dx: alignment.axis === "x" ? direction * alignment.gap * 0.5 : 0,
      dy: alignment.axis === "y" ? direction * alignment.gap * 0.5 : 0,
    },
    {
      node: target,
      dx: alignment.axis === "x" ? -direction * alignment.gap * 0.5 : 0,
      dy: alignment.axis === "y" ? -direction * alignment.gap * 0.5 : 0,
    },
  ];

  if (sourceDistance >= targetDistance) {
    return [[sourceMove], [targetMove], splitMoves];
  }

  return [[targetMove], [sourceMove], splitMoves];
}

function wouldOverlapWithCandidateMoves(nodes: PositionedMapNode[], moves: NodeMove[]) {
  const movedById = new Map(moves.map((move) => [move.node.id, move]));

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const aMove = movedById.get(a.id);
      const bMove = movedById.get(b.id);

      if (!aMove && !bMove) {
        continue;
      }

      if (
        rectanglesOverlap(
          a.x + (aMove?.dx ?? 0),
          a.y + (aMove?.dy ?? 0),
          a.width,
          a.height,
          b.x + (bMove?.dx ?? 0),
          b.y + (bMove?.dy ?? 0),
          b.width,
          b.height,
        )
      ) {
        return true;
      }
    }
  }

  return false;
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

function getNodeCenter(nodes: PositionedMapNode[]): LayoutCenter {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length,
    y: nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length,
  };
}
