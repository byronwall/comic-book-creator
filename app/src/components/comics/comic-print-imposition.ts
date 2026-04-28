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
  const paddedPages: Array<ComicPage | undefined> = [...pages];
  while (paddedPages.length % 4 !== 0) {
    paddedPages.push(undefined);
  }

  const orderedPages: Array<ComicPage | undefined> = [];
  for (let left = 0, right = paddedPages.length - 1; left < right; left += 2, right -= 2) {
    const outsideLeft = paddedPages[right];
    const outsideRight = paddedPages[left];
    const insideLeft = paddedPages[left + 1];
    const insideRight = paddedPages[right - 1];

    orderedPages.push(outsideLeft, outsideRight, insideLeft, insideRight);
  }

  return orderedPages;
}
