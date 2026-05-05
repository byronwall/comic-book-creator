import { describe, expect, it } from "vitest";
import type { ComicPage } from "~/lib/comics/types";
import { buildComicPrintSheets } from "./comic-print-imposition";

function comicPage(id: string, cover = false): ComicPage {
  return {
    id,
    title: id,
    cover,
    status: "Draft",
    layout: "blank",
    texts: [],
  };
}

function sheetIds(pageCount: number) {
  const pages = Array.from({ length: pageCount }, (_, index) => comicPage(`page-${index + 1}`, index === 0));
  return buildComicPrintSheets(pages, "booklet").map((sheet) => sheet.slots.map((slot) => slot.page?.id ?? "blank"));
}

describe("comic print imposition", () => {
  it("prints a 13-page booklet with only the needed blank slots", () => {
    const sheets = sheetIds(13);

    expect(sheets).toEqual([
      ["blank", "page-1"],
      ["page-2", "blank"],
      ["blank", "page-3"],
      ["page-4", "page-13"],
      ["page-12", "page-5"],
      ["page-6", "page-11"],
      ["page-10", "page-7"],
      ["page-8", "page-9"],
    ]);
    expect(sheets.flat().filter((id) => id === "blank")).toHaveLength(3);
  });

  it("keeps two-up consecutive printing unchanged for a single page", () => {
    expect(buildComicPrintSheets([comicPage("page-1")], "two-up-consecutive")).toEqual([
      {
        id: "sheet-1",
        slots: [
          { id: "page-1", page: comicPage("page-1") },
          { id: "blank-1-2", page: undefined },
        ],
      },
    ]);
  });
});
