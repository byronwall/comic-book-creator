import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
  buildAdjacencyMap,
  createInitialLayout,
  filterSpatialMapDataForIsolation,
  filterSpatialMapDataByRelatedNodes,
  getIsolationContinuitySet,
  stepLayout,
} from "./layout";
import { alignLayoutBorders } from "./border-alignment";
import type { SpatialMapData } from "./types";
import type { PositionedMapNode } from "./types";
import { parseSpatialMapData } from "./validate";

const dataPath = path.join(process.cwd(), "data", "spatial-map.json");
const parsedData = parseSpatialMapData(
  JSON.parse(readFileSync(dataPath, "utf8")),
);

describe("spatial map data", () => {
  it("parses the JSON seed file", () => {
    expect(parsedData.nodes.length).toBeGreaterThan(0);
    expect(parsedData.links.length).toBeGreaterThan(0);
  });
});

describe("spatial map layout", () => {
  it("creates a deterministic starting layout with sized nodes", () => {
    const layout = createInitialLayout(parsedData);
    expect(layout).toHaveLength(parsedData.nodes.length);
    expect(layout.every((node) => node.width > 0 && node.height > 0)).toBe(true);
  });

  it("settles without overlapping nodes while allowing shared borders", () => {
    const layout = createInitialLayout(parsedData);
    const overlappingPairs: string[] = [];

    for (let i = 0; i < layout.length; i += 1) {
      for (let j = i + 1; j < layout.length; j += 1) {
        if (rectanglesOverlap(layout[i], layout[j])) {
          overlappingPairs.push(`${layout[i].id}:${layout[j].id}`);
        }
      }
    }

    expect(overlappingPairs).toEqual([]);
  });

  it("packs nodes tightly enough to create shared borders", () => {
    const layout = createInitialLayout(parsedData);
    let touchingPairs = 0;

    for (let i = 0; i < layout.length; i += 1) {
      for (let j = i + 1; j < layout.length; j += 1) {
        if (rectanglesTouch(layout[i], layout[j])) {
          touchingPairs += 1;
        }
      }
    }

    expect(touchingPairs).toBeGreaterThanOrEqual(20);
  });

  it("keeps the packed bounds reasonably close to the viewport aspect ratio", () => {
    const layout = createInitialLayout(parsedData);
    const bounds = getLayoutBounds(layout);
    const viewportAspect = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
    const layoutAspect = bounds.width / bounds.height;

    expect(getLayoutDensity(layout, bounds)).toBeGreaterThanOrEqual(0.52);
    expect(layoutAspect).toBeGreaterThanOrEqual(viewportAspect * 0.72);
    expect(layoutAspect).toBeLessThanOrEqual(viewportAspect * 1.2);
  });

  it("keeps focused subgraphs as dense centered blobs instead of spreading them out", () => {
    const focusedData = filterSpatialMapDataByRelatedNodes(parsedData, "page-recipes", 1);
    const layout = createInitialLayout(focusedData);
    const bounds = getLayoutBounds(layout);
    const viewportAspect = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
    const layoutAspect = bounds.width / bounds.height;

    expect(getLayoutDensity(layout, bounds)).toBeGreaterThanOrEqual(0.46);
    expect(layoutAspect).toBeGreaterThanOrEqual(viewportAspect * 0.65);
    expect(layoutAspect).toBeLessThanOrEqual(viewportAspect * 1.25);
    expect(Math.abs(getLayoutCenterX(layout) - VIEWPORT_WIDTH / 2)).toBeLessThanOrEqual(40);
    expect(Math.abs(getLayoutCenterY(layout) - VIEWPORT_HEIGHT / 2)).toBeLessThanOrEqual(40);
  });

  it("steps the force layout without losing nodes", () => {
    const initial = createInitialLayout(parsedData);
    const adjacency = buildAdjacencyMap(parsedData);
    const next = stepLayout(initial, adjacency, initial[0]?.id ?? null);

    expect(next).toHaveLength(initial.length);
    expect(next.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  });

  it("sizes shallower visible nodes larger before layout runs", () => {
    const smallData: SpatialMapData = {
      nodes: [
        {
          id: "root",
          label: "Root",
          type: "page",
          depth: 0,
          metadata: {},
          context: "",
          rawContext: "",
          contextMode: "structured",
        },
        {
          id: "deep",
          label: "Deep",
          type: "component",
          depth: 3,
          metadata: {},
          context: "",
          rawContext: "",
          contextMode: "structured",
        },
      ],
      links: [],
    };

    const layout = createInitialLayout(smallData);
    const rootNode = layout.find((node) => node.id === "root");
    const deepNode = layout.find((node) => node.id === "deep");

    expect(rootNode).toBeDefined();
    expect(deepNode).toBeDefined();
    expect((rootNode?.width ?? 0) > (deepNode?.width ?? 0)).toBe(true);
    expect((rootNode?.height ?? 0) > (deepNode?.height ?? 0)).toBe(true);
    expect((rootNode?.fontSize ?? 0) > (deepNode?.fontSize ?? 0)).toBe(true);
  });

  it("aligns small border gaps between neighboring nodes", () => {
    const nodes = [
      createPositionedNode("a", 100, 100, 100, 80),
      createPositionedNode("b", 211, 100, 100, 80),
    ];
    const aligned = alignLayoutBorders(nodes, createAdjacency([["a", "b"]]));
    const gap =
      Math.abs(aligned[1].x - aligned[0].x) -
      (aligned[0].width + aligned[1].width) / 2;

    expect(Math.abs(gap)).toBeLessThanOrEqual(0.001);
    expect(rectanglesOverlap(aligned[0], aligned[1])).toBe(false);
  });

  it("aligns small visual-neighbor gaps even without a direct graph link", () => {
    const nodes = [
      createPositionedNode("a", 100, 100, 100, 80),
      createPositionedNode("b", 100, 191, 100, 80),
    ];
    const aligned = alignLayoutBorders(nodes, createAdjacency([]));
    const gap =
      Math.abs(aligned[1].y - aligned[0].y) -
      (aligned[0].height + aligned[1].height) / 2;

    expect(Math.abs(gap)).toBeLessThanOrEqual(0.001);
    expect(rectanglesOverlap(aligned[0], aligned[1])).toBe(false);
  });

  it("leaves border gaps open when the edge spans do not face each other", () => {
    const nodes = [
      createPositionedNode("a", 100, 100, 100, 80),
      createPositionedNode("b", 211, 210, 100, 80),
    ];
    const aligned = alignLayoutBorders(nodes, createAdjacency([["a", "b"]]));

    expect(aligned.map((node) => [node.x, node.y])).toEqual([
      [100, 100],
      [211, 210],
    ]);
  });

  it("filters isolation mode down to the same related neighborhood used by focus", () => {
    const coreId = parsedData.nodes[0]?.id ?? null;
    const adjacency = buildAdjacencyMap(parsedData);
    const filtered = filterSpatialMapDataByRelatedNodes(parsedData, coreId, 1);
    const relatedSet = coreId ? new Set([coreId, ...(adjacency.get(coreId) ?? [])]) : new Set();

    expect(filtered.nodes.length).toBeGreaterThan(0);
    expect(filtered.nodes.every((node) => coreId && relatedSet.has(node.id))).toBe(true);
    expect(
      filtered.links.every(
        (link) => coreId && relatedSet.has(link.source) && relatedSet.has(link.target),
      ),
    ).toBe(true);
  });

  it("defaults isolation mode to the nested descendant tree plus ancestor path", () => {
    const coreId = "page-home";
    const filtered = filterSpatialMapDataForIsolation(parsedData, coreId);
    const continuitySet = getIsolationContinuitySet(parsedData, coreId);

    expect(filtered.nodes.length).toBeGreaterThan(1);
    expect(filtered.nodes.every((node) => continuitySet.has(node.id))).toBe(true);
    expect(filtered.nodes.some((node) => node.id === "page-recipes")).toBe(false);
    expect(
      filtered.links.every(
        (link) => continuitySet.has(link.source) && continuitySet.has(link.target),
      ),
    ).toBe(true);
  });

  it("includes ancestors up to the root when isolating a nested node", () => {
    const coreId = "asm-home-hero";
    const filtered = filterSpatialMapDataForIsolation(parsedData, coreId);
    const filteredNodeIds = new Set(filtered.nodes.map((node) => node.id));

    expect(filteredNodeIds.has("page-home")).toBe(true);
    expect(filteredNodeIds.has("asm-home-hero")).toBe(true);
    expect(filteredNodeIds.has("cmp-search-input")).toBe(true);
    expect(filteredNodeIds.has("cmp-cta-button")).toBe(true);
    expect(filteredNodeIds.has("page-recipes")).toBe(false);
  });

  it("can include linked neighbors in isolation mode", () => {
    const coreId = "page-home";
    const filtered = filterSpatialMapDataForIsolation(parsedData, coreId, {
      includeLinked: true,
      maxLinkedDistance: 1,
    });

    expect(filtered.nodes.some((node) => node.id === "page-recipes")).toBe(true);
    expect(filtered.nodes.some((node) => node.id === "asm-home-hero")).toBe(true);
  });
});

function createPositionedNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): PositionedMapNode {
  return {
    id,
    label: id,
    type: "page",
    depth: 0,
    metadata: {},
    context: "",
    rawContext: "",
    contextMode: "structured",
    width,
    height,
    fontSize: 12,
    metaSize: 10,
    x,
    y,
    vx: 0,
    vy: 0,
  };
}

function createAdjacency(edges: [string, string][]) {
  const adjacency = new Map<string, Set<string>>();

  for (const [source, target] of edges) {
    if (!adjacency.has(source)) {
      adjacency.set(source, new Set());
    }
    if (!adjacency.has(target)) {
      adjacency.set(target, new Set());
    }

    adjacency.get(source)?.add(target);
    adjacency.get(target)?.add(source);
  }

  return adjacency;
}

function rectanglesOverlap(a: PositionedMapNode, b: PositionedMapNode) {
  return (
    getAxisOverlap(a.x, a.width, b.x, b.width) > 0 &&
    getAxisOverlap(a.y, a.height, b.y, b.height) > 0
  );
}

function rectanglesTouch(a: PositionedMapNode, b: PositionedMapNode) {
  const overlapX = getAxisOverlap(a.x, a.width, b.x, b.width);
  const overlapY = getAxisOverlap(a.y, a.height, b.y, b.height);
  const tolerance = 4;

  const sharesVerticalBorder =
    Math.abs(overlapX) <= tolerance && overlapY >= -tolerance;
  const sharesHorizontalBorder =
    Math.abs(overlapY) <= tolerance && overlapX >= -tolerance;

  return (
    (sharesVerticalBorder || sharesHorizontalBorder) &&
    !(overlapX > 0 && overlapY > 0)
  );
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

function getLayoutDensity(
  nodes: PositionedMapNode[],
  bounds: { width: number; height: number },
) {
  const nodeArea = nodes.reduce((total, node) => total + node.width * node.height, 0);
  return nodeArea / (bounds.width * bounds.height);
}

function getLayoutCenterX(nodes: PositionedMapNode[]) {
  const bounds = getLayoutBounds(nodes);
  return bounds.minX + bounds.width / 2;
}

function getLayoutCenterY(nodes: PositionedMapNode[]) {
  const bounds = getLayoutBounds(nodes);
  return bounds.minY + bounds.height / 2;
}

function getAxisOverlap(
  aCenter: number,
  aSize: number,
  bCenter: number,
  bSize: number,
) {
  return (aSize + bSize) / 2 - Math.abs(aCenter - bCenter);
}
