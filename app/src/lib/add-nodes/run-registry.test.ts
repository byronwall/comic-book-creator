import { describe, expect, it, vi } from "vitest";
import { createDefaultProjectNodeMetadataSchema } from "~/lib/projects/node-metadata";
import { getAddNodesRunSnapshot, patchAddNodesRun, registerAddNodesRun, subscribeAddNodesRun } from "./run-registry";
import type { AddNodesRunSnapshot, AddNodesRunState } from "./types";

function buildSnapshot(): AddNodesRunSnapshot {
  return {
    runId: "run-1",
    projectId: "project-1",
    status: "queued",
    steps: [],
    currentStepId: "capture-context",
    latestMessage: "Starting",
    brief: "Add billing nodes",
    selectedNodeId: null,
    startedAt: new Date().toISOString(),
    elapsedMs: 0,
    questions: [],
    answers: {},
  };
}

function buildState(): AddNodesRunState {
  return {
    project: {
      id: "project-1",
      name: "Project",
      description: "Description",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeMetadataSchema: createDefaultProjectNodeMetadataSchema(),
      spatialMap: { nodes: [], links: [] },
    },
    selectedNode: null,
    questions: [],
    answers: {},
  };
}

describe("add-nodes run registry", () => {
  it("stores snapshots and publishes terminal updates", () => {
    const listener = vi.fn();
    registerAddNodesRun(buildSnapshot(), buildState());
    const unsubscribe = subscribeAddNodesRun("run-1", listener);

    patchAddNodesRun("run-1", (run) => {
      run.snapshot.status = "completed";
      run.snapshot.latestMessage = "Done";
    });

    const snapshot = getAddNodesRunSnapshot("run-1");

    expect(snapshot?.status).toBe("completed");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].type).toBe("complete");

    unsubscribe();
  });
});
