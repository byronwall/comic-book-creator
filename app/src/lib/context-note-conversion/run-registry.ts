import type {
  ContextNoteConversionRunEvent,
  ContextNoteConversionRunSnapshot,
  ContextNoteConversionRunState,
} from "./types";

type RunListener = (event: ContextNoteConversionRunEvent) => void;

interface ActiveRun {
  snapshot: ContextNoteConversionRunSnapshot;
  state: ContextNoteConversionRunState;
  listeners: Set<RunListener>;
}

interface RunRegistryStore {
  runs: Map<string, ActiveRun>;
}

declare global {
  var __contextNoteConversionRunRegistry__: RunRegistryStore | undefined;
}

function getStore() {
  globalThis.__contextNoteConversionRunRegistry__ ??= { runs: new Map<string, ActiveRun>() };
  return globalThis.__contextNoteConversionRunRegistry__;
}

function getEventType(snapshot: ContextNoteConversionRunSnapshot): ContextNoteConversionRunEvent["type"] {
  if (snapshot.status === "completed") return "complete";
  if (snapshot.status === "failed") return "failed";
  return "snapshot";
}

function notify(run: ActiveRun) {
  const snapshot = structuredClone(run.snapshot);
  const event: ContextNoteConversionRunEvent = {
    type: getEventType(snapshot),
    snapshot,
  };

  for (const listener of run.listeners) {
    listener(event);
  }
}

export function registerContextNoteConversionRun(
  snapshot: ContextNoteConversionRunSnapshot,
  state: ContextNoteConversionRunState,
) {
  getStore().runs.set(snapshot.runId, {
    snapshot,
    state,
    listeners: new Set(),
  });
}

export function getContextNoteConversionRunSnapshot(runId: string) {
  const snapshot = getStore().runs.get(runId)?.snapshot;
  return snapshot ? structuredClone(snapshot) : null;
}

export function getContextNoteConversionRunState(runId: string) {
  return getStore().runs.get(runId)?.state ?? null;
}

export function patchContextNoteConversionRun(runId: string, updater: (run: ActiveRun) => void) {
  const run = getStore().runs.get(runId);
  if (!run) return null;

  updater(run);
  run.snapshot = structuredClone(run.snapshot);
  notify(run);
  return run.snapshot;
}

export function subscribeContextNoteConversionRun(runId: string, listener: RunListener) {
  const run = getStore().runs.get(runId);
  if (!run) return () => undefined;

  run.listeners.add(listener);
  return () => {
    getStore().runs.get(runId)?.listeners.delete(listener);
  };
}
