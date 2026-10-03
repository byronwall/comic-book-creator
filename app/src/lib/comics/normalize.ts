import path from "node:path";
import type { ComicBook, ComicPage, ComicPageImage, ComicPaperSize, ComicTemplateGrid, ComicTextAlign, ComicTextKind } from "./types";
import { getPanelRects } from "./layout-rects";
import { appPath } from "~/lib/router/app-path";

export function normalizeComicBook(input: ComicBook, options: { touchUpdatedAt?: boolean } = {}): ComicBook {
  const id = input.id;
  return {
    ...input,
    id,
    title: cleanText(input.title) || "Untitled Comic Book",
    updatedAt: options.touchUpdatedAt ? new Date().toISOString() : cleanText(input.updatedAt) || new Date().toISOString(),
    pages: input.pages.map((page, index) => normalizePage(page, index, id)),
  };
}

function normalizePage(page: ComicBook["pages"][number], pageIndex: number, bookId: string): ComicPage {
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
  const imageInputs = page.images?.length ? page.images : page.image ? [page.image] : [];
  const images = imageInputs
    .map((image, imageIndex) => normalizePageImage(image, bookId, imageIndex))
    .filter((image): image is ComicPageImage => Boolean(image));

  const { image: _legacyImage, ...pageFields } = page;
  return {
    ...pageFields,
    id: cleanText(page.id) || `page-${pageIndex + 1}`,
    title: cleanText(page.title) || `Page ${pageIndex + 1}`,
    cover: page.cover === true || (page.cover === undefined && isLegacyCoverPage(page)),
    status,
    layout,
    mode: page.mode === "image" && images.length > 0 ? "image" : "comic",
    images,
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
        ...text,
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

function normalizePageImage(image: ComicPageImage | undefined, bookId: string, imageIndex: number): ComicPageImage | undefined {
  if (!image || !cleanText(image.filename)) {
    return undefined;
  }

  const filename = path.basename(cleanText(image.filename));
  const treatment =
    image.treatment === "color" || image.treatment === "threshold" ? image.treatment : "grayscale";
  const legacySize = clampInteger(image.scale ?? 100, 50, 160);
  const width = clampNumber(image.width ?? legacySize, 5, 200);
  const height = clampNumber(image.height ?? legacySize, 5, 200);
  const x = clampNumber(image.x ?? (100 - legacySize) / 2 + (image.offsetX ?? 0), -195, 95);
  const y = clampNumber(image.y ?? (100 - legacySize) / 2 + (image.offsetY ?? 0), -195, 95);
  const sourceFilename = image.crop?.sourceFilename;
  const corners = image.crop?.corners;
  const crop = typeof sourceFilename === "string"
    && sourceFilename.length > 0
    && path.basename(sourceFilename) === sourceFilename
    && Array.isArray(corners)
    && corners.length === 4
    && corners.every((point) => typeof point?.x === "number" && Number.isFinite(point.x) && point.x >= 0 && point.x <= 1
      && typeof point?.y === "number" && Number.isFinite(point.y) && point.y >= 0 && point.y <= 1)
    ? { sourceFilename, corners }
    : undefined;

  return {
    ...image,
    id: cleanText(image.id) || `image-${imageIndex + 1}-${filename.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    src: appPath(`/api/private/comic-books/${bookId}/images/${encodeURIComponent(filename)}`),
    filename,
    originalName: cleanText(image.originalName) || filename,
    mimeType: cleanText(image.mimeType) || "image/jpeg",
    treatment,
    brightness: clampInteger(image.brightness ?? 105, 50, 150),
    contrast: clampInteger(image.contrast ?? 125, 50, 300),
    threshold: clampInteger(image.threshold ?? 58, 10, 90),
    x,
    y,
    width,
    height,
    rotation: clampInteger(image.rotation ?? 0, -180, 180),
    fit: image.fit === "cover" ? "cover" : "contain",
    crop,
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

function clampInteger(value: number, min: number, max: number) {
  return Math.round(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function cleanText(value: string) {
  return typeof value === "string" ? value.trim() : "";
}
