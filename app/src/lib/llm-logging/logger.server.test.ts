import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  completeLlmSession,
  getLlmSessionArtifactPath,
  recordLlmSessionEvent,
  startLlmSession,
  withLlmCallLogging,
} from "./logger.server";

describe("llm logger", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("writes one artifact per session under the project-level llm_logs directory", async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), "llm-logger-project-"));
    const appRoot = path.join(projectRoot, "app");
    mkdirSync(appRoot, { recursive: true });
    process.chdir(appRoot);

    await startLlmSession("add-nodes", "session-1", {
      metadata: {
        projectId: "project-1",
        brief: "Add a dense filter bar",
      },
    });
    await recordLlmSessionEvent("add-nodes", "session-1", {
      stage: "answers-submitted",
      message: "Captured answers.",
      data: { answers: { scope: "filters" } },
    });
    await withLlmCallLogging(
      "add-nodes",
      "session-1",
      {
        callId: "generate-nodes",
        label: "Generate candidate nodes",
        request: {
          modelId: "gpt-5.4",
          prompt: "Generate nodes",
        },
      },
      async () => ({
        experimental_output: {
          summary: "Generated nodes",
          nodes: [{ id: "node-1" }],
        },
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      }),
      (value) => ({
        response: {
          output: value.experimental_output,
          usage: value.usage,
        },
      }),
    );
    await completeLlmSession("add-nodes", "session-1", {
      summary: "Generated nodes",
      nodeCount: 1,
    });

    const artifactPath = getLlmSessionArtifactPath("add-nodes", "session-1");
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

    expect(artifactPath.endsWith(path.join("llm_logs", "add-nodes", "session-1.json"))).toBe(true);
    expect(artifact.status).toBe("completed");
    expect(artifact.metadata).toEqual({
      projectId: "project-1",
      brief: "Add a dense filter bar",
    });
    expect(artifact.events).toEqual([
      expect.objectContaining({
        stage: "answers-submitted",
        message: "Captured answers.",
        data: { answers: { scope: "filters" } },
      }),
    ]);
    expect(artifact.llmCalls).toEqual([
      expect.objectContaining({
        id: "generate-nodes",
        label: "Generate candidate nodes",
        status: "completed",
        request: {
          modelId: "gpt-5.4",
          prompt: "Generate nodes",
        },
        response: {
          output: {
            summary: "Generated nodes",
            nodes: [{ id: "node-1" }],
          },
          usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
          },
        },
      }),
    ]);
  });
});
