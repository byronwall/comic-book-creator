import type { ComicLayoutKind, ComicPage } from "~/lib/comics/types";

export type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const layoutTemplates: Array<{
  id: ComicLayoutKind;
  label: string;
  description: string;
}> = [
  { id: "four", label: "Four Panels", description: "Balanced 2 by 2 grid" },
  { id: "bigTop", label: "Big Top", description: "Wide opener with three beats" },
  { id: "threeStack", label: "Three Stack", description: "Three horizontal moments" },
  { id: "wideMiddle", label: "Wide Middle", description: "Small panels around a reveal" },
  { id: "splashLeft", label: "Splash Left", description: "Large action panel and side beats" },
  { id: "six", label: "Six Panels", description: "Fast six-beat sequence" },
];

export function getPanelRects(page: Pick<ComicPage, "layout" | "customGrid">): PanelRect[] {
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
    const rects: PanelRect[] = [];

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

export function findPanelIndex(panels: PanelRect[], pageX: number, pageY: number) {
  const index = panels.findIndex(
    (panel) =>
      pageX >= panel.x &&
      pageX <= panel.x + panel.width &&
      pageY >= panel.y &&
      pageY <= panel.y + panel.height,
  );

  if (index >= 0) return index;

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  panels.forEach((panel, indexValue) => {
    const centerX = panel.x + panel.width / 2;
    const centerY = panel.y + panel.height / 2;
    const distance = Math.hypot(pageX - centerX, pageY - centerY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = indexValue;
    }
  });
  return nearestIndex;
}

export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
