import { describe, expect, it } from "vitest";
import { parseFollowUpSuggestions, parseGeneratedNodeBatch, parseQuestionSet } from "./service";

describe("add-nodes structured validation", () => {
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

  it("rejects malformed node batches", () => {
    expect(() =>
      parseGeneratedNodeBatch({
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

  it("normalizes generated graph links for persistence", () => {
    expect(
      parseGeneratedNodeBatch({
        summary: "Generated",
        nodes: [
          {
            id: "node-1",
            label: "Node 1",
            type: "component",
            depth: 2,
            metadata: {
              purpose: "Purpose",
              implementation: "Implementation",
            },
            context: "",
          },
        ],
        links: [
          {
            source: "parent",
            target: "node-1",
            parentChild: true,
            relationship: "related",
          },
          {
            source: "node-1",
            target: "existing",
            parentChild: false,
          },
        ],
      }).links,
    ).toEqual([
      {
        source: "parent",
        target: "node-1",
        parentChild: true,
      },
      {
        source: "node-1",
        target: "existing",
        parentChild: false,
        relationship: "related",
      },
    ]);
  });

  it("requires exactly four follow-up suggestions", () => {
    expect(() =>
      parseFollowUpSuggestions({
        suggestions: [
          {
            id: "follow-1",
            label: "One",
            brief: "Do one",
            guidance: "Guide one",
          },
        ],
      }),
    ).toThrow();
  });
});
