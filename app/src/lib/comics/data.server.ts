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
    page.layout === "splashInset" ||
    page.layout === "threeVertical" ||
    page.layout === "fourStrip" ||
    page.layout === "revealBottom" ||
    page.layout === "heroRight" ||
    page.layout === "diagonalAction" ||
    page.layout === "diagonalGrid" ||
    page.layout === "cinematicSlant" ||
    page.layout === "letterbox" ||
    page.layout === "establishingDialogue" ||
    page.layout === "webtoonStack" ||
    page.layout === "doubleFeature" ||
    page.layout === "blank" ||
    page.layout === "custom"
      ? page.layout
      : "four";

  const customGrid = normalizeTemplateGrid(page.customGrid);
  const panels = getPanelRects({ layout, customGrid });

  return {
    id: cleanText(page.id) || `page-${pageIndex + 1}`,
    title: cleanText(page.title) || `Page ${pageIndex + 1}`,
    cover: page.cover === true || (page.cover === undefined && isLegacyCoverPage(page)),
    status,
    layout,
    paperSize: normalizePaperSize(page.paperSize),
    customGrid,
    texts: page.texts.map((text, textIndex) => {
      const kind = normalizeTextKind(text.kind);
      const textValue = typeof text.text === "string" ? text.text : "";
      const fontSize = clampInteger(text.fontSize, 12, 54);
      const panelIndex = clampInteger(text.panelIndex, 0, Math.max(0, panels.length - 1));
      const panel = panels[panelIndex] ?? panels[0] ?? { x: 0, y: 0, width: 100, height: 100 };
      const isPageScoped = text.positionScope === "page";
      const x = isPageScoped ? clampNumber(text.x, -8, 98) : panel.x + (panel.width * clampNumber(text.x, 0, 88)) / 100;
      const y = isPageScoped ? clampNumber(text.y, -8, 98) : panel.y + (panel.height * clampNumber(text.y, 0, 88)) / 100;
      const width = isPageScoped ? clampNumber(text.width, 8, 96) : (panel.width * clampNumber(text.width, 16, 92)) / 100;
      const height = isPageScoped
        ? clampNumber(text.height ?? getDefaultTextHeight(kind, textValue, fontSize), 5, 50)
        : (panel.height * clampNumber(text.height ?? getDefaultTextHeight(kind, textValue, fontSize), 5, 50)) / 100;
      const rotation = typeof text.rotation === "number" ? clampNumber(text.rotation, -180, 180) : kind === "sfx" ? -9 : 0;

      return {
        id: cleanText(text.id) || `text-${pageIndex + 1}-${textIndex + 1}`,
        kind,
        text: textValue,
        panelIndex,
        positionScope: "page" as const,
        x,
        y,
        width,
        height,
        fontSize,
        rotation,
        align: normalizeTextAlign(text.align),
        autoWrap: text.autoWrap !== false,
      };
    }),
  };
}

function isLegacyCoverPage(page: ComicBook["pages"][number]) {
  const marker = `${page.title ?? ""} ${page.id ?? ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return marker.includes("cover");
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

function getDefaultTextHeight(kind: ComicTextKind, text: string, fontSize: number) {
  const lineHeightMultiplier = 1.08;
  const lineCount = Math.max(1, text.split("\n").length);
  const contentHeight = lineCount * fontSize * lineHeightMultiplier;
  const legacyPixelHeight =
    kind === "speech"
      ? Math.max(52, contentHeight + 24) + 24
      : kind === "thought"
        ? Math.max(48, contentHeight + 26) + 34
        : kind === "caption"
          ? Math.max(38, contentHeight + 18) + 10
          : Math.max(56, contentHeight + 8) + 10;

  return Math.min(50, Math.max(5, legacyPixelHeight / 7));
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
  if (page.layout === "blank") {
    return [];
  }

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

  if (page.layout === "splashInset") {
    return [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 62, y: 6, width: 32, height: 24 },
    ];
  }

  if (page.layout === "threeVertical") {
    return [
      { x: 0, y: 0, width: 30.5, height: 100 },
      { x: 34.75, y: 0, width: 30.5, height: 100 },
      { x: 69.5, y: 0, width: 30.5, height: 100 },
    ];
  }

  if (page.layout === "fourStrip") {
    return [
      { x: 0, y: 0, width: 22, height: 100 },
      { x: 26, y: 0, width: 22, height: 100 },
      { x: 52, y: 0, width: 22, height: 100 },
      { x: 78, y: 0, width: 22, height: 100 },
    ];
  }

  if (page.layout === "revealBottom") {
    return [
      { x: 0, y: 0, width: 30.5, height: 28 },
      { x: 34.75, y: 0, width: 30.5, height: 28 },
      { x: 69.5, y: 0, width: 30.5, height: 28 },
      { x: 0, y: 32, width: 100, height: 68 },
    ];
  }

  if (page.layout === "heroRight") {
    return [
      { x: 0, y: 0, width: 34, height: 31 },
      { x: 0, y: 34.5, width: 34, height: 31 },
      { x: 0, y: 69, width: 34, height: 31 },
      { x: 38, y: 0, width: 62, height: 100 },
    ];
  }

  if (page.layout === "diagonalAction") {
    return [
      { x: 0, y: 0, width: 100, height: 48 },
      { x: 0, y: 52, width: 100, height: 48 },
    ];
  }

  if (page.layout === "diagonalGrid") {
    return [
      { x: 0, y: 0, width: 64, height: 41 },
      { x: 48, y: 0, width: 52, height: 72 },
      { x: 0, y: 20, width: 54, height: 80 },
      { x: 40, y: 53, width: 60, height: 47 },
    ];
  }

  if (page.layout === "cinematicSlant") {
    return [
      { x: 0, y: 0, width: 100, height: 40 },
      { x: 0, y: 38, width: 52, height: 46 },
      { x: 56, y: 30, width: 44, height: 46 },
      { x: 0, y: 75, width: 100, height: 25 },
    ];
  }

  if (page.layout === "letterbox") {
    return [
      { x: 0, y: 0, width: 100, height: 29 },
      { x: 0, y: 35.5, width: 100, height: 29 },
      { x: 0, y: 71, width: 100, height: 29 },
    ];
  }

  if (page.layout === "establishingDialogue") {
    return [
      { x: 0, y: 0, width: 100, height: 35 },
      { x: 0, y: 39, width: 48, height: 28.5 },
      { x: 52, y: 39, width: 48, height: 28.5 },
      { x: 0, y: 71.5, width: 48, height: 28.5 },
      { x: 52, y: 71.5, width: 48, height: 28.5 },
    ];
  }

  if (page.layout === "webtoonStack") {
    return [
      { x: 0, y: 0, width: 100, height: 16 },
      { x: 0, y: 20, width: 100, height: 20 },
      { x: 0, y: 48, width: 100, height: 32 },
      { x: 0, y: 88, width: 100, height: 12 },
    ];
  }

  if (page.layout === "doubleFeature") {
    return [
      { x: 0, y: 0, width: 100, height: 48 },
      { x: 0, y: 52, width: 100, height: 48 },
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
    height: getDefaultTextHeight(kind, text, fontSize),
    fontSize,
    rotation: kind === "sfx" ? -9 : 0,
    align: "center" as const,
    autoWrap: true,
  };
}
