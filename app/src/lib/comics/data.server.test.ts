import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createComicBookOnDisk, readComicBookByIdFromDisk, writeComicBookByIdToDisk } from "./data.server";
import type { ComicBook, ComicPageImage, ComicPhotoCorners } from "./types";

describe("comic book persistence", () => {
  it("keeps the original photo and crop corners after saving", async () => {
    const originalDataDir = process.env.APP_DATA_DIR;
    process.env.APP_DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "comic-book-crop-"));
    try {
      const book = await createComicBookOnDisk({ title: "Crop test" });
      const corners: ComicPhotoCorners = [
        { x: 0.1, y: 0.2 }, { x: 0.9, y: 0.1 },
        { x: 0.85, y: 0.9 }, { x: 0.15, y: 0.8 },
      ];
      const image = {
        id: "image-1", src: "", filename: "processed.png", originalName: "page.jpg", mimeType: "image/png",
        treatment: "grayscale", brightness: 105, contrast: 125, threshold: 58,
        x: 0, y: 0, width: 100, height: 100, rotation: 0, fit: "contain",
        crop: { sourceFilename: "original.jpg", corners },
      } satisfies ComicPageImage;
      await writeComicBookByIdToDisk(book.id, {
        ...book,
        pages: [{ ...book.pages[0], mode: "image", images: [image] }],
      });
      const saved = await readComicBookByIdFromDisk(book.id);
      expect(saved?.pages[0]?.images?.[0]?.crop).toEqual(image.crop);
      expect(saved?.pages[0]?.images?.[0]?.filename).toBe("processed.png");
    } finally {
      if (originalDataDir === undefined) delete process.env.APP_DATA_DIR;
      else process.env.APP_DATA_DIR = originalDataDir;
    }
  });

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
