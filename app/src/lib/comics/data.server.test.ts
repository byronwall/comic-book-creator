import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readComicBookByIdFromDisk, writeComicBookByIdToDisk } from "./data.server";
import type { ComicBook } from "./types";

describe("comic book persistence", () => {
  it("preserves trailing spaces in speech bubble text", async () => {
    const originalDataDir = process.env.APP_DATA_DIR;
    const dataDir = mkdtempSync(path.join(os.tmpdir(), "comic-book-data-"));

    try {
      process.env.APP_DATA_DIR = dataDir;

      const book: ComicBook = {
        id: "speech-space",
        title: "Speech Space",
        updatedAt: "2026-04-25T00:00:00.000Z",
        pages: [
          {
            id: "page-1",
            title: "Page 1",
            status: "Draft",
            layout: "four",
            paperSize: "letter-portrait",
            texts: [
              {
                id: "speech-1",
                kind: "speech",
                text: "HELLO THERE ",
                panelIndex: 0,
                positionScope: "page",
                x: 10,
                y: 10,
                width: 34,
                fontSize: 18,
                align: "center",
              },
            ],
          },
        ],
      };

      await writeComicBookByIdToDisk(book.id, book);

      const persisted = await readComicBookByIdFromDisk(book.id);
      expect(persisted?.pages[0]?.texts[0]?.text).toBe("HELLO THERE ");
    } finally {
      if (originalDataDir === undefined) {
        delete process.env.APP_DATA_DIR;
      } else {
        process.env.APP_DATA_DIR = originalDataDir;
      }
    }
  });
});
