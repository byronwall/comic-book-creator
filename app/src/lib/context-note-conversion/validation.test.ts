import { describe, expect, it } from "vitest";
import { parseCandidateBatch, parseQuestionSet, parseTrimResult } from "./service";

describe("context-note-conversion structured validation", () => {
  it("rejects malformed question payloads", () => {
    expect(() =>
      parseQuestionSet({
        questions: [
          {
            id: "scope",
            prompt: "Scope?",
            helperText: "Choose one",
            options: [{ id: "a", label: "A" }],
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects malformed candidate batches", () => {
    expect(() =>
      parseCandidateBatch({
        summary: "Generated",
        nodes: [
          {
            id: "node-1",
            label: "Node 1",
            type: "component",
            depth: 2,
            metadata: { purpose: 1 },
          },
        ],
        links: [],
      }),
    ).toThrow();
  });

  it("requires a trim summary", () => {
    expect(() =>
      parseTrimResult({
        trimmedContext: "",
      }),
    ).toThrow();
  });
});
