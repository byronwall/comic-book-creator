import type {
  NodeImageGenerationRunEvent,
  NodeImageGenerationRunSnapshot,
} from "./types";

type RunListener = (event: NodeImageGenerationRunEvent) => void;

interface ActiveRun {
  snapshot: NodeImageGenerationRunSnapshot;
  listeners: Set<RunListener>;
}

interface RunRegistryStore {
  runs: Map<string, ActiveRun>;
}

declare global {
  var __nodeImageGenerationRunRegistry__: RunRegistryStore | undefined;
}

function getStore() {
  globalThis.__nodeImageGenerationRunRegistry__ ??= { runs: new Map<string, ActiveRun>() };
  return globalThis.__nodeImageGenerationRunRegistry__;
}

function getEventType(
  snapshot: NodeImageGenerationRunSnapshot,
): NodeImageGenerationRunEvent["type"] {
  if (snapshot.status === "completed") return "complete";
  if (snapshot.status === "failed") return "failed";
  return "snapshot";
}

function notify(run: ActiveRun) {
  const snapshot = structuredClone(run.snapshot);
  const event: NodeImageGenerationRunEvent = {
    type: getEventType(snapshot),
    snapshot,
  };

  for (const listener of run.listeners) {
    listener(event);
  }
}

export function registerNodeImageGenerationRun(snapshot: NodeImageGenerationRunSnapshot) {
  getStore().runs.set(snapshot.runId, {
    snapshot,
    listeners: new Set(),
  });
}

export function getNodeImageGenerationRunSnapshot(runId: string) {
  const snapshot = getStore().runs.get(runId)?.snapshot;
  return snapshot ? structuredClone(snapshot) : null;
}

export function patchNodeImageGenerationRun(
  runId: string,
  updater: (run: ActiveRun) => void,
) {
  const run = getStore().runs.get(runId);
  if (!run) return null;

  updater(run);
  run.snapshot = structuredClone(run.snapshot);
  notify(run);
  return run.snapshot;
}

export function subscribeNodeImageGenerationRun(runId: string, listener: RunListener) {
  const run = getStore().runs.get(runId);
  if (!run) return () => undefined;

  run.listeners.add(listener);
  return () => {
    getStore().runs.get(runId)?.listeners.delete(listener);
  };
}
