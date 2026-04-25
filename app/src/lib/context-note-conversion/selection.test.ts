import { describe, expect, it } from "vitest";
import { getTreeCheckedState, toggleTreeSelection } from "./selection";
import type { ConversionCandidateTree } from "./types";

const tree: ConversionCandidateTree = {
  roots: ["root"],
  items: {
    root: {
      nodeId: "root",
      label: "Root",
      type: "page",
      depth: 0,
      metadata: { purpose: "Purpose", implementation: "Implementation" },
      childNodeIds: ["child-a", "child-b"],
    },
    "child-a": {
      nodeId: "child-a",
      label: "Child A",
      type: "assembly",
      depth: 1,
      metadata: { purpose: "Purpose", implementation: "Implementation" },
      childNodeIds: [],
    },
    "child-b": {
      nodeId: "child-b",
      label: "Child B",
      type: "assembly",
      depth: 1,
      metadata: { purpose: "Purpose", implementation: "Implementation" },
      childNodeIds: ["leaf"],
    },
    leaf: {
      nodeId: "leaf",
      label: "Leaf",
      type: "component",
      depth: 2,
      metadata: { purpose: "Purpose", implementation: "Implementation" },
      childNodeIds: [],
    },
  },
};

describe("context note conversion tree selection", () => {
  it("unchecks and rechecks descendants with a parent toggle", () => {
    const cleared = toggleTreeSelection(tree, ["root", "child-a", "child-b", "leaf"], "root", false);
    expect(cleared).toEqual([]);

    const restored = toggleTreeSelection(tree, [], "child-b", true).sort();
    expect(restored).toEqual(["child-b", "leaf"]);
  });

  it("returns indeterminate when only part of a subtree is selected", () => {
    expect(getTreeCheckedState(tree, new Set(["child-b"]), "root")).toBe("indeterminate");
    expect(getTreeCheckedState(tree, new Set(["child-b", "leaf"]), "child-b")).toBe(true);
    expect(getTreeCheckedState(tree, new Set(), "child-a")).toBe(false);
  });
});
