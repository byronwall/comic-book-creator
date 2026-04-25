import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAppDataDir } from "~/lib/server/data-dir";
import type {
  ComicBook,
  ComicBookSummary,
  ComicLayoutKind,
  ComicPage,
  ComicPaperSize,
  ComicTemplateGrid,
  ComicTextAlign,
  ComicTextKind,
} from "./types";

const COMIC_BOOK_FILE = "comic-book.json";
const COMIC_BOOKS_DIR = "comic-books";

export async function readComicBookFromDisk(): Promise<ComicBook> {
  const summaries = await readComicBookSummariesFromDisk();
  const book = await readComicBookByIdFromDisk(summaries[0]?.id || "super-max");
  return book ?? createDefaultComicBook();
}

export async function writeComicBookToDisk(input: ComicBook): Promise<ComicBook> {
  return writeComicBookByIdToDisk(input.id, input);
}

export async function readComicBookSummariesFromDisk(): Promise<ComicBookSummary[]> {
  await ensureComicBooksDir();
  const filenames = await readdir(getComicBooksDir());
  const books = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".json"))
      .map(async (filename) => {
        const fileContents = await readFile(path.join(getComicBooksDir(), filename), "utf8");
        return normalizeComicBook(JSON.parse(fileContents) as ComicBook, { touchUpdatedAt: false });
      }),
  );

  return books
    .map((book) => ({
      id: book.id,
      title: book.title,
      updatedAt: book.updatedAt,
      pageCount: book.pages.length,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readComicBookByIdFromDisk(bookId: string): Promise<ComicBook | null> {
  await ensureComicBooksDir();
  const cleanId = slugify(bookId);
  if (!cleanId) {
    return null;
  }

  const bookPath = getComicBookPath(cleanId);
  if (!existsSync(bookPath)) {
    return null;
  }

  const fileContents = await readFile(bookPath, "utf8");
  return normalizeComicBook(JSON.parse(fileContents) as ComicBook, { touchUpdatedAt: false });
}

export async function writeComicBookByIdToDisk(bookId: string, input: ComicBook): Promise<ComicBook> {
  await ensureComicBooksDir();
  const nextBook = normalizeComicBook(input, { touchUpdatedAt: true });
  const id = slugify(bookId) || nextBook.id;
  const book = { ...nextBook, id };
  await writeFile(getComicBookPath(id), `${JSON.stringify(book, null, 2)}\n`, "utf8");
  await writeFile(getLegacyComicBookPath(), `${JSON.stringify(book, null, 2)}\n`, "utf8");
  return book;
}

export async function deleteComicBookOnDisk(bookId: string): Promise<void> {
  await ensureComicBooksDir();
  const cleanId = slugify(bookId);
  if (!cleanId) {
    throw new Error("A book id is required.");
  }

  const bookPath = getComicBookPath(cleanId);
  if (!existsSync(bookPath)) {
    return;
  }

  await unlink(bookPath);
}

export async function createComicBookOnDisk(input: { title?: string } = {}): Promise<ComicBook> {
  await ensureComicBooksDir();
  const seed = createDefaultComicBook();
  const title = cleanText(input.title || "") || "Untitled Comic Book";
  const id = await createAvailableBookId(slugify(title) || "comic-book");
  const nextBook = normalizeComicBook({
    ...seed,
    id,
    title,
    pages: [
      {
        id: "page-1",
        title: "Page 1",
        status: "Blank",
        layout: "four",
        paperSize: "letter-portrait",
        texts: [],
      },
    ],
  });
  await writeFile(getComicBookPath(id), `${JSON.stringify(nextBook, null, 2)}\n`, "utf8");
  return nextBook;
}

function getLegacyComicBookPath() {
  return path.join(resolveAppDataDir(), COMIC_BOOK_FILE);
}

function getComicBooksDir() {
  return path.join(resolveAppDataDir(), COMIC_BOOKS_DIR);
}

function getComicBookPath(bookId: string) {
  return path.join(getComicBooksDir(), `${slugify(bookId)}.json`);
}

async function ensureComicBooksDir() {
  await mkdir(resolveAppDataDir(), { recursive: true });
  await mkdir(getComicBooksDir(), { recursive: true });

  const filenames = await readdir(getComicBooksDir());
  if (filenames.some((filename) => filename.endsWith(".json"))) {
    return;
  }

  if (existsSync(getLegacyComicBookPath())) {
    const fileContents = await readFile(getLegacyComicBookPath(), "utf8");
    const legacyBook = normalizeComicBook(JSON.parse(fileContents) as ComicBook, { touchUpdatedAt: false });
    await writeFile(getComicBookPath(legacyBook.id), `${JSON.stringify(legacyBook, null, 2)}\n`, "utf8");
    return;
  }

  const seedBooks = [
    createDefaultComicBook(),
    createDefaultComicBookVariant("space-adventure", "Space Adventure", "bigTop"),
    createDefaultComicBookVariant("dino-expedition", "Dino Expedition", "four"),
  ];
  await Promise.all(
    seedBooks.map((book) => writeFile(getComicBookPath(book.id), `${JSON.stringify(book, null, 2)}\n`, "utf8")),
  );
}

async function createAvailableBookId(baseId: string) {
  let candidate = baseId;
  let index = 2;
  while (existsSync(getComicBookPath(candidate))) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
}

function normalizeComicBook(input: ComicBook, options: { touchUpdatedAt?: boolean } = {}): ComicBook {
  const id = slugify(input.id) || "super-max";
  return {
    id,
    title: cleanText(input.title) || "Super Max Saves the Day",
    updatedAt: options.touchUpdatedAt ? new Date().toISOString() : cleanText(input.updatedAt) || new Date().toISOString(),
    pages: input.pages.length > 0 ? input.pages.map(normalizePage) : createDefaultComicBook().pages,
  };
}

function normalizePage(page: ComicBook["pages"][number], pageIndex: number): ComicPage {
  const status: ComicPage["status"] =
    page.status === "Ready" || page.status === "Draft" ? page.status : "Blank";
  const layout: ComicPage["layout"] =
    page.layout === "bigTop" ||
    page.layout === "threeStack" ||
    page.layout === "wideMiddle" ||
    page.layout === "splashLeft" ||
    page.layout === "six" ||
    page.layout === "custom"
      ? page.layout
      : "four";

  const customGrid = normalizeTemplateGrid(page.customGrid);
  const panels = getPanelRects({ layout, customGrid });

  return {
    id: cleanText(page.id) || `page-${pageIndex + 1}`,
    title: cleanText(page.title) || `Page ${pageIndex + 1}`,
    status,
    layout,
    paperSize: normalizePaperSize(page.paperSize),
    customGrid,
    texts: page.texts.map((text, textIndex) => {
      const panelIndex = clampInteger(text.panelIndex, 0, Math.max(0, panels.length - 1));
      const panel = panels[panelIndex] ?? panels[0] ?? { x: 0, y: 0, width: 100, height: 100 };
      const isPageScoped = text.positionScope === "page";
      const x = isPageScoped ? clampNumber(text.x, -8, 98) : panel.x + (panel.width * clampNumber(text.x, 0, 88)) / 100;
      const y = isPageScoped ? clampNumber(text.y, -8, 98) : panel.y + (panel.height * clampNumber(text.y, 0, 88)) / 100;
      const width = isPageScoped ? clampNumber(text.width, 8, 96) : (panel.width * clampNumber(text.width, 16, 92)) / 100;

      return {
        id: cleanText(text.id) || `text-${pageIndex + 1}-${textIndex + 1}`,
        kind: normalizeTextKind(text.kind),
        text: cleanText(text.text) || "HELLO!",
        panelIndex,
        positionScope: "page" as const,
        x,
        y,
        width,
        fontSize: clampInteger(text.fontSize, 12, 54),
        align: normalizeTextAlign(text.align),
      };
    }),
  };
}

function normalizeTemplateGrid(grid: ComicTemplateGrid | undefined): ComicTemplateGrid | undefined {
  if (!grid) {
    return undefined;
  }

  const cleanLines = (lines: number[]) =>
    [...new Set(lines.map((line) => clampInteger(line, 12, 88)))]
      .sort((a, b) => a - b)
      .slice(0, 4);

  return {
    verticalLines: cleanLines(grid.verticalLines || []),
    horizontalLines: cleanLines(grid.horizontalLines || []),
  };
}

function normalizeTextKind(kind: ComicTextKind): ComicTextKind {
  return kind === "thought" || kind === "caption" || kind === "sfx" ? kind : "speech";
}

function normalizeTextAlign(align: ComicTextAlign): ComicTextAlign {
  return align === "left" || align === "right" ? align : "center";
}

function normalizePaperSize(paperSize: ComicPaperSize | undefined): ComicPaperSize {
  return paperSize === "letter-landscape" || paperSize === "half-portrait" || paperSize === "half-landscape"
    ? paperSize
    : "letter-portrait";
}

function getPanelRects(page: {
  layout: ComicLayoutKind;
  customGrid?: ComicTemplateGrid;
}): { x: number; y: number; width: number; height: number }[] {
  if (page.layout === "bigTop") {
    return [
      { x: 0, y: 0, width: 100, height: 34 },
      { x: 0, y: 37, width: 48, height: 29 },
      { x: 52, y: 37, width: 48, height: 29 },
      { x: 0, y: 69, width: 100, height: 31 },
    ];
  }

  if (page.layout === "threeStack") {
    return [
      { x: 0, y: 0, width: 100, height: 31 },
      { x: 0, y: 34.5, width: 100, height: 31 },
      { x: 0, y: 69, width: 100, height: 31 },
    ];
  }

  if (page.layout === "wideMiddle") {
    return [
      { x: 0, y: 0, width: 48, height: 25 },
      { x: 52, y: 0, width: 48, height: 25 },
      { x: 0, y: 29, width: 100, height: 42 },
      { x: 0, y: 75, width: 48, height: 25 },
      { x: 52, y: 75, width: 48, height: 25 },
    ];
  }

  if (page.layout === "splashLeft") {
    return [
      { x: 0, y: 0, width: 62, height: 100 },
      { x: 66, y: 0, width: 34, height: 31 },
      { x: 66, y: 34.5, width: 34, height: 31 },
      { x: 66, y: 69, width: 34, height: 31 },
    ];
  }

  if (page.layout === "six") {
    return [
      { x: 0, y: 0, width: 48, height: 31 },
      { x: 52, y: 0, width: 48, height: 31 },
      { x: 0, y: 34.5, width: 48, height: 31 },
      { x: 52, y: 34.5, width: 48, height: 31 },
      { x: 0, y: 69, width: 48, height: 31 },
      { x: 52, y: 69, width: 48, height: 31 },
    ];
  }

  if (page.layout === "custom") {
    const verticalCuts = [0, ...(page.customGrid?.verticalLines ?? [50]), 100].sort((a, b) => a - b);
    const horizontalCuts = [0, ...(page.customGrid?.horizontalLines ?? [50]), 100].sort((a, b) => a - b);
    const rects: { x: number; y: number; width: number; height: number }[] = [];
    for (let row = 0; row < horizontalCuts.length - 1; row += 1) {
      for (let column = 0; column < verticalCuts.length - 1; column += 1) {
        const x = verticalCuts[column];
        const y = horizontalCuts[row];
        rects.push({
          x,
          y,
          width: verticalCuts[column + 1] - x,
          height: horizontalCuts[row + 1] - y,
        });
      }
    }
    return rects;
  }

  return [
    { x: 0, y: 0, width: 48, height: 48 },
    { x: 52, y: 0, width: 48, height: 48 },
    { x: 0, y: 52, width: 48, height: 48 },
    { x: 52, y: 52, width: 48, height: 48 },
  ];
}

function clampInteger(value: number, min: number, max: number) {
  return Math.round(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function cleanText(value: string) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function createDefaultComicBook(): ComicBook {
  return {
    id: "super-max",
    title: "Super Max Saves the Day",
    updatedAt: new Date().toISOString(),
    pages: [
      {
        id: "cover",
        title: "Cover",
        status: "Ready",
        layout: "four",
        paperSize: "letter-portrait",
        texts: [
          createText("caption", "MEANWHILE, IN MEGACITY...", 0, 10, 8, 15),
          createText("speech", "WE NEED\nTO STOP\nDR. DOOM!", 1, 14, 16, 18),
          createText("thought", "I HOPE MY\nPLAN WORKS!", 2, 12, 18, 15),
          createText("sfx", "POW!", 3, 22, 22, 46),
        ],
      },
      {
        id: "big-battle",
        title: "Big Battle",
        status: "Draft",
        layout: "bigTop",
        paperSize: "letter-portrait",
        texts: [
          createText("caption", "THE CITY SHOOK!", 0, 8, 8, 15),
          createText("speech", "WOW!", 2, 16, 18, 20),
          createText("thought", "WE'D BETTER\nBE CAREFUL.", 3, 22, 18, 15),
        ],
      },
      {
        id: "ending",
        title: "Ending",
        status: "Blank",
        layout: "four",
        paperSize: "letter-portrait",
        texts: [],
      },
    ],
  };
}

function createDefaultComicBookVariant(
  id: string,
  title: string,
  layout: ComicPage["layout"],
): ComicBook {
  return {
    ...createDefaultComicBook(),
    id,
    title,
    pages: [
      {
        id: "page-1",
        title: "Opening",
        status: "Draft",
        layout,
        paperSize: "letter-portrait",
        texts: [createText("caption", title.toUpperCase(), 0, 8, 8, 15)],
      },
      {
        id: "page-2",
        title: "Next Scene",
        status: "Blank",
        layout: "four",
        paperSize: "letter-portrait",
        texts: [],
      },
    ],
  };
}

function createText(
  kind: ComicTextKind,
  text: string,
  panelIndex: number,
  x: number,
  y: number,
  fontSize: number,
) {
  return {
    id: `${kind}-${panelIndex}-${x}-${y}`,
    kind,
    text,
    panelIndex,
    x,
    y,
    width: kind === "sfx" ? 34 : 42,
    fontSize,
    align: "center" as const,
  };
}
