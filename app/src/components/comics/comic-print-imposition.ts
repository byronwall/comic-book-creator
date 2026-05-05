import type { ComicPage } from "~/lib/comics/types";

export type ComicPrintArrangement = "two-up-consecutive" | "booklet";

export type ComicPrintSlot = {
  id: string;
  page?: ComicPage;
};

export type ComicPrintSheet = {
  id: string;
  slots: ComicPrintSlot[];
};

const slotsPerSheet = 2;

export function buildComicPrintSheets(pages: ComicPage[], arrangement: ComicPrintArrangement = "two-up-consecutive") {
  const orderedPages = orderPagesForArrangement(pages, arrangement);
  const sheets: ComicPrintSheet[] = [];

  for (let sheetIndex = 0; sheetIndex < orderedPages.length; sheetIndex += slotsPerSheet) {
    const sheetPages = orderedPages.slice(sheetIndex, sheetIndex + slotsPerSheet);
    sheets.push({
      id: `sheet-${sheets.length + 1}`,
      slots: Array.from({ length: slotsPerSheet }, (_, slotIndex) => {
        const page = sheetPages[slotIndex];
        return {
          id: page?.id ?? `blank-${sheets.length + 1}-${slotIndex + 1}`,
          page,
        };
      }),
    });
  }

  return sheets;
}

function orderPagesForArrangement(pages: ComicPage[], arrangement: ComicPrintArrangement) {
  if (arrangement === "booklet") {
    return orderPagesForBooklet(pages);
  }

  return pages;
}

function orderPagesForBooklet(pages: ComicPage[]) {
  const frontCover = pages[0]?.cover ? pages[0] : pages.find(isFrontCoverPage) ?? pages[0];
  if (!frontCover) {
    return [];
  }

  const lastPage = pages[pages.length - 1];
  const endCover = lastPage?.cover && lastPage.id !== frontCover.id ? lastPage : [...pages].reverse().find(isEndCoverPage);
  const readingOrder = [frontCover, ...pages.filter((page) => page.id !== frontCover.id && page.id !== endCover?.id)];

  if (endCover) {
    readingOrder.push(endCover);
  }

  const pageCount = Math.ceil(readingOrder.length / 4) * 4;
  const paddedPages: Array<ComicPage | undefined> = [...readingOrder];
  while (paddedPages.length < pageCount) {
    paddedPages.push(undefined);
  }

  const orderedPages: Array<ComicPage | undefined> = [];
  const sheetCount = pageCount / 4;

  for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex += 1) {
    const outerLeftIndex = pageCount - 1 - sheetIndex * 2;
    const outerRightIndex = sheetIndex * 2;
    const innerLeftIndex = sheetIndex * 2 + 1;
    const innerRightIndex = pageCount - 2 - sheetIndex * 2;

    orderedPages.push(
      paddedPages[outerLeftIndex],
      paddedPages[outerRightIndex],
      paddedPages[innerLeftIndex],
      paddedPages[innerRightIndex],
    );
  }

  return orderedPages;
}

function isFrontCoverPage(page: ComicPage) {
  const marker = getPageMarker(page);
  return !isEndCoverPage(page) && (marker.includes("front-cover") || marker.includes("cover"));
}

function isEndCoverPage(page: ComicPage) {
  const marker = getPageMarker(page);
  return marker.includes("end-cover") || marker.includes("back-cover");
}

function getPageMarker(page: ComicPage) {
  return `${page.title} ${page.id}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
