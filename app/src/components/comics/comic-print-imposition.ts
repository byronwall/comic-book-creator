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
  const contentPages = pages.filter((page) => page.id !== frontCover.id && page.id !== endCover?.id);
  const orderedPages: Array<ComicPage | undefined> = [endCover, frontCover, undefined, undefined];

  for (const [pageIndex, page] of contentPages.entries()) {
    const slotIndex = pageIndex === 0 ? 2 : 4 * Math.ceil(pageIndex / slotsPerSheet) + (pageIndex % slotsPerSheet === 1 ? 1 : 2);
    while (orderedPages.length <= slotIndex) {
      orderedPages.push(undefined);
    }
    orderedPages[slotIndex] = page;
  }

  while (orderedPages.length % 4 !== 0) {
    orderedPages.push(undefined);
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
