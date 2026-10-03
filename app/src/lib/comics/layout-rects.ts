import type { ComicLayoutKind, ComicTemplateGrid } from "./types";

export function getPanelRects(page: {
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
