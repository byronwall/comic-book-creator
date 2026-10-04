import { describe, expect, it } from "vitest";
import type { ComicBook } from "~/lib/comics/types";
import { createComicDraftQueue, DraftSaveError } from "./comic-draft-queue";

const book = (title: string, revision = 1): ComicBook => ({
  id: "book-1", ownerUserId: "user-1", revision, title, updatedAt: "2026-01-01", pages: [],
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

describe("comic draft queue", () => {
  it("saves one snapshot at a time and sends only the newest pending draft at the confirmed revision", async () => {
    const first = deferred<ComicBook>();
    const calls: Array<{ title: string; revision: number }> = [];
    const queue = createComicDraftQueue({
      revision: 1,
      save: (draft, revision) => {
        calls.push({ title: draft.title, revision });
        return calls.length === 1 ? first.promise : Promise.resolve(book(draft.title, revision + 1));
      },
      onSaved: () => {}, onPause: () => {}, onState: () => {},
    });

    queue.schedule(book("first"));
    queue.schedule(book("middle"));
    queue.schedule(book("newest"));
    first.resolve(book("first", 2));
    expect(await queue.flush()).toBe(true);
    expect(calls).toEqual([{ title: "first", revision: 1 }, { title: "newest", revision: 2 }]);
    expect(queue.revision).toBe(3);
  });

  it("keeps the failed draft paused and refuses resume after a stale revision check", async () => {
    const paused: string[] = [];
    const queue = createComicDraftQueue({
      revision: 4,
      save: async () => { throw new DraftSaveError("conflict"); },
      onSaved: () => {}, onPause: (reason) => paused.push(reason), onState: () => {},
    });

    queue.schedule(book("local", 4));
    expect(await queue.flush()).toBe(false);
    expect(queue.paused).toBe("conflict");
    expect(paused).toEqual(["conflict"]);
    expect(queue.resume(5)).toBe(false);
    expect(queue.resume(4)).toBe(true);
    expect(await queue.flush()).toBe(false);
    expect(queue.paused).toBe("conflict");
  });

  it("ignores a late acknowledgment after reset", async () => {
    const response = deferred<ComicBook>();
    const saved: string[] = [];
    const queue = createComicDraftQueue({
      revision: 2,
      save: () => response.promise,
      onSaved: (snapshot) => saved.push(snapshot.title), onPause: () => {}, onState: () => {},
    });

    queue.schedule(book("discarded", 2));
    queue.reset(8);
    response.resolve(book("discarded", 3));
    expect(await queue.flush()).toBe(true);
    expect(saved).toEqual([]);
    expect(queue.revision).toBe(8);
  });
});
