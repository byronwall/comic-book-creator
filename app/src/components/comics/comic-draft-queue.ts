import type { ComicBook } from "~/lib/comics/types";

export type DraftPause = "expired" | "conflict" | "account" | "network";

export function createComicDraftQueue(options: {
  revision: number;
  save: (book: ComicBook, revision: number) => Promise<ComicBook>;
  onSaved: (snapshot: ComicBook, revision: number) => void;
  onPause: (reason: DraftPause) => void;
  onState: (saving: boolean) => void;
}) {
  let revision = options.revision;
  let pending: ComicBook | undefined;
  let flight: Promise<void> | undefined;
  let paused: DraftPause | undefined;
  let generation = 0;

  function schedule(book: ComicBook) {
    pending = book;
    if (!paused) void drain();
  }

  function drain() {
    if (flight) return flight;
    if (paused || !pending) return Promise.resolve();
    const requestGeneration = generation;
    options.onState(true);
    flight = (async () => {
      while (pending && !paused && requestGeneration === generation) {
        const snapshot: ComicBook = pending;
        pending = undefined;
        try {
          const saved = await options.save(snapshot, revision);
          if (requestGeneration !== generation) continue;
          revision = saved.revision;
          options.onSaved(snapshot, revision);
        } catch (error) {
          if (requestGeneration !== generation) continue;
          pending = pending ?? snapshot;
          paused = error instanceof DraftSaveError ? error.reason : "network";
          options.onPause(paused);
        }
      }
    })().finally(() => {
      flight = undefined;
      options.onState(false);
      if (pending && !paused) void drain();
    });
    return flight;
  }

  return {
    get revision() { return revision; },
    get paused() { return paused; },
    get hasPending() { return Boolean(pending || flight); },
    async flush() {
      while (flight || (pending && !paused)) await (flight ?? drain());
      return !pending && !flight && !paused;
    },
    async waitForFlight() {
      while (flight) await flight;
    },
    resume(checkedRevision: number) {
      if (checkedRevision !== revision) return false;
      paused = undefined;
      void drain();
      return true;
    },
    pause(reason: DraftPause) {
      paused = reason;
    },
    reset(revisionNext: number) {
      generation += 1;
      revision = revisionNext;
      pending = undefined;
      paused = undefined;
      options.onState(false);
    },
    dispose() {
      generation += 1;
      pending = undefined;
      paused = "account";
      options.onState(false);
    },
    schedule,
  };
}

export class DraftSaveError extends Error {
  constructor(readonly reason: DraftPause, message: string = reason) {
    super(message);
  }
}
