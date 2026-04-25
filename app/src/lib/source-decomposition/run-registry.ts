import type {
  SourceDecompositionRunEvent,
  SourceDecompositionRunSnapshot,
  SourceDecompositionRunState,
} from "./types";

type RunListener = (event: SourceDecompositionRunEvent) => void;

interface ActiveRun {
  snapshot: SourceDecompositionRunSnapshot;
  state: SourceDecompositionRunState;
  listeners: Set<RunListener>;
}

interface RunRegistryStore {
  runs: Map<string, ActiveRun>;
}

declare global {
  var __sourceDecompositionRunRegistry__: RunRegistryStore | undefined;
}

function getStore() {
  globalThis.__sourceDecompositionRunRegistry__ ??= { runs: new Map<string, ActiveRun>() };
  return globalThis.__sourceDecompositionRunRegistry__;
}

function getEventType(snapshot: SourceDecompositionRunSnapshot): SourceDecompositionRunEvent["type"] {
  if (snapshot.status === "completed") return "complete";
  if (snapshot.status === "failed") return "failed";
  return "snapshot";
}

function notify(run: ActiveRun) {
  const snapshot = structuredClone(run.snapshot);
  const event: SourceDecompositionRunEvent = {
    type: getEventType(snapshot),
    snapshot,
  };

  for (const listener of run.listeners) {
    listener(event);
  }
}

export function registerSourceDecompositionRun(
  snapshot: SourceDecompositionRunSnapshot,
  state: SourceDecompositionRunState,
) {
  getStore().runs.set(snapshot.runId, {
    snapshot,
    state,
    listeners: new Set(),
  });
}

export function getSourceDecompositionRunSnapshot(runId: string) {
  const snapshot = getStore().runs.get(runId)?.snapshot;
  return snapshot ? structuredClone(snapshot) : null;
}

export function getSourceDecompositionRunState(runId: string) {
  return getStore().runs.get(runId)?.state ?? null;
}

export function patchSourceDecompositionRun(runId: string, updater: (run: ActiveRun) => void) {
  const run = getStore().runs.get(runId);
  if (!run) return null;

  updater(run);
  run.snapshot = structuredClone(run.snapshot);
  notify(run);
  return run.snapshot;
}

export function subscribeSourceDecompositionRun(runId: string, listener: RunListener) {
  const run = getStore().runs.get(runId);
  if (!run) return () => undefined;

  run.listeners.add(listener);
  return () => {
    getStore().runs.get(runId)?.listeners.delete(listener);
  };
}
