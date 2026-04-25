import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProjectNodeMetadataSchema } from "~/lib/projects/node-metadata";
import type { ProjectRecord } from "~/lib/projects/types";
import type { MapNode } from "~/lib/spatial-map/types";

const {
  generateText,
  readProjectByIdFromDisk,
  appendGeneratedNodesToProjectOnDisk,
  updateProjectNodeContextOnDisk,
  startLlmSession,
  recordLlmSessionEvent,
  completeLlmSession,
  failLlmSession,
  withLlmCallLogging,
} = vi.hoisted(() => ({
  generateText: vi.fn(),
  readProjectByIdFromDisk: vi.fn(),
  appendGeneratedNodesToProjectOnDisk: vi.fn(),
  updateProjectNodeContextOnDisk: vi.fn(),
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
  updateProjectNodeContextOnDisk,
}));

vi.mock("~/lib/llm-logging/logger.server", () => ({
  startLlmSession,
  recordLlmSessionEvent,
  completeLlmSession,
  failLlmSession,
  withLlmCallLogging,
}));

import {
  acceptContextNoteConversionSelection,
  startContextNoteConversionRun,
  submitContextNoteConversionAnswers,
} from "./service";
import { getContextNoteConversionRunSnapshot } from "./run-registry";

function buildSourceNode(overrides: Partial<MapNode> = {}): MapNode {
  return {
    id: "note-source",
    label: "Source Note",
    type: "note",
    depth: 2,
    metadata: {
      purpose: "Loose context",
      implementation: "Stored on the node",
    },
    context: "Original note context",
    rawContext: "Original note context",
    contextMode: "context-only",
    ...overrides,
  };
}

function buildProject(sourceNode: MapNode = buildSourceNode()): ProjectRecord {
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
          id: "page-home",
          label: "Home",
          type: "page",
          depth: 0,
          metadata: {
            purpose: "Purpose",
            implementation: "Implementation",
          },
          context: "",
          rawContext: "",
          contextMode: "structured",
        },
        sourceNode,
      ],
      links: [],
    },
  };
}

describe("context note conversion service", () => {
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

  it("advances from question generation to candidate review", async () => {
    const project = buildProject();
    readProjectByIdFromDisk.mockResolvedValue(project);
    generateText
      .mockResolvedValueOnce({
        experimental_output: {
          questions: [
            {
              id: "scope",
              prompt: "Scope?",
              helperText: "Pick one",
              options: [
                { id: "a", label: "A", detail: "Detail A" },
                { id: "b", label: "B", detail: "Detail B" },
                { id: "c", label: "C", detail: "Detail C" },
              ],
            },
            {
              id: "depth",
              prompt: "Depth?",
              helperText: "Pick one",
              options: [
                { id: "a", label: "A", detail: "Detail A" },
                { id: "b", label: "B", detail: "Detail B" },
                { id: "c", label: "C", detail: "Detail C" },
              ],
            },
            {
              id: "style",
              prompt: "Style?",
              helperText: "Pick one",
              options: [
                { id: "a", label: "A", detail: "Detail A" },
                { id: "b", label: "B", detail: "Detail B" },
                { id: "c", label: "C", detail: "Detail C" },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        experimental_output: {
          summary: "Generated candidates",
          nodes: [
            {
              id: "candidate-root",
              label: "Candidate Root",
              type: "page",
              depth: 0,
              metadata: {
                purpose: "Root purpose",
                implementation: "Root implementation",
              },
              context: "",
              rawContext: "",
              contextMode: "structured",
            },
            {
              id: "candidate-child",
              label: "Candidate Child",
              type: "assembly",
              depth: 1,
              metadata: {
                purpose: "Child purpose",
                implementation: "Child implementation",
              },
              context: "",
              rawContext: "",
              contextMode: "structured",
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

    const started = await startContextNoteConversionRun({
      projectId: project.id,
      input: { sourceNodeId: "note-source" },
    });

    await vi.waitFor(() => {
      expect(getContextNoteConversionRunSnapshot(started.runId)?.status).toBe("awaiting-input");
    });

    const questionSnapshot = getContextNoteConversionRunSnapshot(started.runId);
    expect(questionSnapshot?.questions).toHaveLength(3);

    await submitContextNoteConversionAnswers({
      projectId: project.id,
      runId: started.runId,
      input: {
        answers: {
          scope: "a",
          depth: "b",
          style: "c",
        },
      },
    });

    await vi.waitFor(() => {
      expect(getContextNoteConversionRunSnapshot(started.runId)?.status).toBe("awaiting-review");
    });

    const reviewSnapshot = getContextNoteConversionRunSnapshot(started.runId);
    expect(reviewSnapshot?.candidateBatch?.tree.roots).toEqual(["candidate-root"]);
    expect(reviewSnapshot?.candidateBatch?.tree.items["candidate-root"]?.childNodeIds).toEqual(["candidate-child"]);
  });

  it("persists only accepted nodes and trims the source context", async () => {
    const project = buildProject();
    const sourceNode = project.spatialMap.nodes[1]!;
    readProjectByIdFromDisk.mockResolvedValue(project);
    generateText
      .mockResolvedValueOnce({
        experimental_output: {
          questions: [
            {
              id: "scope",
              prompt: "Scope?",
              helperText: "Pick one",
              options: [
                { id: "a", label: "A", detail: "Detail A" },
                { id: "b", label: "B", detail: "Detail B" },
                { id: "c", label: "C", detail: "Detail C" },
              ],
            },
            {
              id: "depth",
              prompt: "Depth?",
              helperText: "Pick one",
              options: [
                { id: "a", label: "A", detail: "Detail A" },
                { id: "b", label: "B", detail: "Detail B" },
                { id: "c", label: "C", detail: "Detail C" },
              ],
            },
            {
              id: "style",
              prompt: "Style?",
              helperText: "Pick one",
              options: [
                { id: "a", label: "A", detail: "Detail A" },
                { id: "b", label: "B", detail: "Detail B" },
                { id: "c", label: "C", detail: "Detail C" },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        experimental_output: {
          summary: "Generated candidates",
          nodes: [
            {
              id: "candidate-root",
              label: "Candidate Root",
              type: "page",
              depth: 0,
              metadata: {
                purpose: "Root purpose",
                implementation: "Root implementation",
              },
              context: "",
              rawContext: "",
              contextMode: "structured",
            },
            {
              id: "candidate-child",
              label: "Candidate Child",
              type: "assembly",
              depth: 1,
              metadata: {
                purpose: "Child purpose",
                implementation: "Child implementation",
              },
              context: "",
              rawContext: "",
              contextMode: "structured",
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
      })
      .mockResolvedValueOnce({
        experimental_output: {
          trimmedContext: "Leftover note fragment",
          summary: "Trimmed context down to the remaining material.",
        },
      });

    const persistedProject: ProjectRecord = {
      ...project,
      spatialMap: {
        ...project.spatialMap,
        nodes: [
          ...project.spatialMap.nodes,
          {
            id: "page-candidate-root",
            label: "Candidate Root",
            type: "page",
            depth: 0,
            metadata: {
              purpose: "Root purpose",
              implementation: "Root implementation",
            },
            context: "",
            rawContext: "",
            contextMode: "structured",
          },
        ],
        links: [],
      },
    };
    appendGeneratedNodesToProjectOnDisk.mockResolvedValue(persistedProject);

    const trimmedProject: ProjectRecord = {
      ...persistedProject,
      spatialMap: {
        ...persistedProject.spatialMap,
        nodes: persistedProject.spatialMap.nodes.map((node) =>
          node.id === sourceNode.id ? { ...node, context: "Leftover note fragment" } : node,
        ),
      },
    };
    updateProjectNodeContextOnDisk.mockResolvedValue(trimmedProject);

    const started = await startContextNoteConversionRun({
      projectId: project.id,
      input: { sourceNodeId: sourceNode.id },
    });

    await vi.waitFor(() => {
      expect(getContextNoteConversionRunSnapshot(started.runId)?.status).toBe("awaiting-input");
    });

    await submitContextNoteConversionAnswers({
      projectId: project.id,
      runId: started.runId,
      input: {
        answers: {
          scope: "a",
          depth: "b",
          style: "c",
        },
      },
    });

    await vi.waitFor(() => {
      expect(getContextNoteConversionRunSnapshot(started.runId)?.status).toBe("awaiting-review");
    });

    await acceptContextNoteConversionSelection({
      projectId: project.id,
      runId: started.runId,
      input: { acceptedNodeIds: ["candidate-root"] },
    });

    await vi.waitFor(() => {
      expect(getContextNoteConversionRunSnapshot(started.runId)?.status).toBe("completed");
    });

    expect(appendGeneratedNodesToProjectOnDisk).toHaveBeenCalledWith({
      projectId: project.id,
      generated: {
        summary: "Generated candidates",
        nodes: [
          expect.objectContaining({
            id: "candidate-root",
          }),
        ],
        links: [],
      },
    });
    expect(updateProjectNodeContextOnDisk).toHaveBeenCalledWith({
      projectId: project.id,
      nodeId: sourceNode.id,
      context: "Leftover note fragment",
    });
  });
});
