import type { CheckedState } from "~/components/ui/checkbox";
import type { ConversionCandidateTree } from "./types";

export function getDescendantIds(tree: ConversionCandidateTree, nodeId: string): string[] {
  const descendantIds: string[] = [];
  const visit = (currentNodeId: string) => {
    for (const childId of tree.items[currentNodeId]?.childNodeIds ?? []) {
      descendantIds.push(childId);
      visit(childId);
    }
  };
  visit(nodeId);
  return descendantIds;
}

export function getTreeCheckedState(
  tree: ConversionCandidateTree,
  selectedNodeIds: Set<string>,
  nodeId: string,
): CheckedState {
  const groupIds = [nodeId, ...getDescendantIds(tree, nodeId)];
  const checkedCount = groupIds.filter((candidateId) => selectedNodeIds.has(candidateId)).length;

  if (checkedCount === 0) return false;
  if (checkedCount === groupIds.length) return true;
  return "indeterminate";
}

export function toggleTreeSelection(
  tree: ConversionCandidateTree,
  selectedNodeIds: Iterable<string>,
  nodeId: string,
  checked: boolean,
) {
  const nextSelection = new Set(selectedNodeIds);

  const visit = (currentNodeId: string) => {
    if (checked) {
      nextSelection.add(currentNodeId);
    } else {
      nextSelection.delete(currentNodeId);
    }

    for (const childId of tree.items[currentNodeId]?.childNodeIds ?? []) {
      visit(childId);
    }
  };

  visit(nodeId);
  return [...nextSelection];
}
