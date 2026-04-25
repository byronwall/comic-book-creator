import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProjectNodeMetadataSchema } from "~/lib/projects/node-metadata";
import type { ProjectRecord } from "~/lib/projects/types";

const {
  generateText,
  readProjectByIdFromDisk,
  appendGeneratedNodesToProjectOnDisk,
  addProjectNodeImageSourcesOnDisk,
  startLlmSession,
  recordLlmSessionEvent,
  completeLlmSession,
  failLlmSession,
  withLlmCallLogging,
} = vi.hoisted(() => ({
  generateText: vi.fn(),
  readProjectByIdFromDisk: vi.fn(),
  appendGeneratedNodesToProjectOnDisk: vi.fn(),
  addProjectNodeImageSourcesOnDisk: vi.fn(),
  startLlmSession: vi.fn(),
  recordLlmSessionEvent: vi.fn(),
  completeLlmSession: vi.fn(),
  failLlmSession: vi.fn(),
  withLlmCallLogging: vi.fn(async (_pipeline, _sessionId, _definition, operation, buildResult) => {
    const value = await operation();
    buildResult(value);
    return value;
  }),
}));

vi.mock("ai", () => ({
  generateText,
  Output: {
    object: vi.fn((value) => value),
  },
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((modelId: string) => modelId),
}));

vi.mock("~/lib/projects/data.server", () => ({
  readProjectByIdFromDisk,
  appendGeneratedNodesToProjectOnDisk,
  addProjectNodeImageSourcesOnDisk,
}));

vi.mock("~/lib/llm-logging/logger.server", () => ({
  startLlmSession,
  recordLlmSessionEvent,
  completeLlmSession,
  failLlmSession,
  withLlmCallLogging,
}));

import {
  acceptSourceDecompositionSelection,
  startSourceDecompositionRun,
} from "./service";
import { getSourceDecompositionRunSnapshot } from "./run-registry";

function buildProject(): ProjectRecord {
  return {
    id: "project-1",
    name: "Project",
    description: "Description",
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
    nodeMetadataSchema: createDefaultProjectNodeMetadataSchema(),
    spatialMap: {
      nodes: [
        {
          id: "existing-page",
          label: "Existing Page",
          type: "page",
          depth: 0,
          metadata: {
            purpose: "Existing purpose",
            implementation: "Existing implementation",
          },
          context: "",
          rawContext: "",
          contextMode: "structured",
          images: [],
        },
      ],
      links: [],
    },
  };
}

describe("source decomposition service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    withLlmCallLogging.mockImplementation(async (_pipeline, _sessionId, _definition, operation, buildResult) => {
      const value = await operation();
      buildResult(value);
      return value;
    });
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-5-mini";
    process.env.OPENAI_HEAVY_MODEL = "gpt-5.4";
  });

  it("keeps empty child sourceAssetIds instead of fanning the upload out to every node", async () => {
    const project = buildProject();
    readProjectByIdFromDisk.mockResolvedValue(project);
    generateText.mockResolvedValueOnce({
      experimental_output: {
        summary: "Generated candidates",
        styleCommentary: "Structured UI with dense controls.",
        nodes: [
          {
            id: "candidate-root",
            label: "Purchases",
            type: "page",
            depth: 0,
            metadata: {
              purpose: "Root purpose",
              implementation: "Root implementation",
            },
            context: "",
            rawContext: "",
            contextMode: "structured",
            sourceAssetIds: ["asset-root"],
          },
          {
            id: "candidate-child",
            label: "Filter Bar",
            type: "region",
            depth: 1,
            metadata: {
              purpose: "Child purpose",
              implementation: "Child implementation",
            },
            context: "",
            rawContext: "",
            contextMode: "structured",
            sourceAssetIds: [],
          },
        ],
        links: [
          {
            source: "candidate-root",
            target: "candidate-child",
            parentChild: true,
          },
        ],
      },
    });

    const started = await startSourceDecompositionRun({
      projectId: project.id,
      input: {
        sourceText: "Purchases page",
        selectedNodeId: null,
        images: [new File(["image-bytes"], "purchases.png", { type: "image/png" })],
      },
    });

    await vi.waitFor(() => {
      expect(getSourceDecompositionRunSnapshot(started.runId)?.status).toBe("awaiting-review");
    });

    const snapshot = getSourceDecompositionRunSnapshot(started.runId);
    expect(snapshot?.candidateBatch?.sourceAssetIdsByNodeId).toEqual({
      "candidate-root": ["asset-root"],
      "candidate-child": [],
    });
  });

  it("attaches uploaded source images only to accepted root nodes", async () => {
    const project = buildProject();
    readProjectByIdFromDisk.mockResolvedValue(project);
    generateText.mockResolvedValueOnce({
      experimental_output: {
        summary: "Generated candidates",
        styleCommentary: "Structured UI with dense controls.",
        nodes: [
          {
            id: "candidate-root",
            label: "Purchases",
            type: "page",
            depth: 0,
            metadata: {
              purpose: "Root purpose",
              implementation: "Root implementation",
            },
            context: "",
            rawContext: "",
            contextMode: "structured",
            sourceAssetIds: [],
          },
          {
            id: "candidate-child",
            label: "Filter Bar",
            type: "region",
            depth: 1,
            metadata: {
              purpose: "Child purpose",
              implementation: "Child implementation",
            },
            context: "",
            rawContext: "",
            contextMode: "structured",
            sourceAssetIds: ["asset-1"],
          },
        ],
        links: [
          {
            source: "candidate-root",
            target: "candidate-child",
            parentChild: true,
          },
        ],
      },
    });

    const persistedProject: ProjectRecord = {
      ...project,
      spatialMap: {
        ...project.spatialMap,
        nodes: [
          ...project.spatialMap.nodes,
          {
            id: "page-purchases",
            label: "Purchases",
            type: "page",
            depth: 0,
            metadata: {
              purpose: "Root purpose",
              implementation: "Root implementation",
            },
            context: "",
            rawContext: "",
            contextMode: "structured",
            images: [],
          },
          {
            id: "region-filter-bar",
            label: "Filter Bar",
            type: "region",
            depth: 1,
            metadata: {
              purpose: "Child purpose",
              implementation: "Child implementation",
            },
            context: "",
            rawContext: "",
            contextMode: "structured",
            images: [],
          },
        ],
        links: [
          {
            source: "page-purchases",
            target: "region-filter-bar",
            parentChild: true,
          },
        ],
      },
    };
    appendGeneratedNodesToProjectOnDisk.mockResolvedValue(persistedProject);
    addProjectNodeImageSourcesOnDisk.mockResolvedValue(persistedProject);

    const started = await startSourceDecompositionRun({
      projectId: project.id,
      input: {
        sourceText: "Purchases page",
        selectedNodeId: null,
        images: [new File(["image-bytes"], "purchases.png", { type: "image/png" })],
      },
    });

    await vi.waitFor(() => {
      expect(getSourceDecompositionRunSnapshot(started.runId)?.status).toBe("awaiting-review");
    });

    await acceptSourceDecompositionSelection({
      projectId: project.id,
      runId: started.runId,
      input: {
        acceptedNodeIds: ["candidate-root", "candidate-child"],
      },
    });

    await vi.waitFor(() => {
      expect(getSourceDecompositionRunSnapshot(started.runId)?.status).toBe("completed");
    });

    expect(addProjectNodeImageSourcesOnDisk).not.toHaveBeenCalled();
    expect(getSourceDecompositionRunSnapshot(started.runId)?.result?.attachedImageCount).toBe(0);
  });
});
