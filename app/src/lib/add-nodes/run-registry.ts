import type {
  AddNodesRunEvent,
  AddNodesRunSnapshot,
  AddNodesRunState,
} from "./types";

type RunListener = (event: AddNodesRunEvent) => void;

interface AddNodesActiveRun {
  snapshot: AddNodesRunSnapshot;
  state: AddNodesRunState;
  listeners: Set<RunListener>;
}

interface AddNodesRunRegistryStore {
  runs: Map<string, AddNodesActiveRun>;
}

declare global {
  var __addNodesRunRegistry__: AddNodesRunRegistryStore | undefined;
}

function getStore() {
  globalThis.__addNodesRunRegistry__ ??= { runs: new Map<string, AddNodesActiveRun>() };
  return globalThis.__addNodesRunRegistry__;
}

function getEventType(snapshot: AddNodesRunSnapshot): AddNodesRunEvent["type"] {
  if (snapshot.status === "completed") return "complete";
  if (snapshot.status === "failed") return "failed";
  return "snapshot";
}

function notify(run: AddNodesActiveRun) {
  const snapshot = structuredClone(run.snapshot);
  const event: AddNodesRunEvent = {
    type: getEventType(snapshot),
    snapshot,
  };

  for (const listener of run.listeners) {
    listener(event);
  }
}

export function registerAddNodesRun(snapshot: AddNodesRunSnapshot, state: AddNodesRunState) {
  getStore().runs.set(snapshot.runId, {
    snapshot,
    state,
    listeners: new Set(),
  });
}

export function getAddNodesRunSnapshot(runId: string) {
  const snapshot = getStore().runs.get(runId)?.snapshot;
  return snapshot ? structuredClone(snapshot) : null;
}

export function getAddNodesRunState(runId: string) {
  return getStore().runs.get(runId)?.state ?? null;
}

export function patchAddNodesRun(
  runId: string,
  updater: (run: AddNodesActiveRun) => void,
) {
  const run = getStore().runs.get(runId);
  if (!run) return null;

  updater(run);
  run.snapshot = structuredClone(run.snapshot);
  notify(run);
  return run.snapshot;
}

export function subscribeAddNodesRun(runId: string, listener: RunListener) {
  const run = getStore().runs.get(runId);
  if (!run) return () => undefined;

  run.listeners.add(listener);
  return () => {
    getStore().runs.get(runId)?.listeners.delete(listener);
  };
}
