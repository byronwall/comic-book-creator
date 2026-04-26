import type { ComicLayoutKind, ComicPage } from "~/lib/comics/types";

export type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  points?: string;
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
  { id: "splashInset", label: "Splash Inset", description: "Full scene with a small close-up" },
  { id: "threeVertical", label: "Three Vertical", description: "Three dialogue beats side by side" },
  { id: "fourStrip", label: "Four Strip", description: "Classic setup and punchline row" },
  { id: "revealBottom", label: "Big Reveal", description: "Small setup panels over a finale" },
  { id: "heroRight", label: "Splash Right", description: "Side beats leading into a hero panel" },
  { id: "diagonalAction", label: "Action Slash", description: "Angled-feeling two-beat action page" },
  { id: "diagonalGrid", label: "Diagonal Action", description: "Four sharp panels for high-impact scenes" },
  { id: "cinematicSlant", label: "Cinematic Slant", description: "Slanted panels for mood and pacing" },
  { id: "letterbox", label: "Letterbox", description: "Cinematic horizontal sequence" },
  { id: "establishingDialogue", label: "Talk Scene", description: "Wide opener with reaction grid" },
  { id: "webtoonStack", label: "Webtoon Stack", description: "Tall scrolling-style page beats" },
  { id: "doubleFeature", label: "Double Feature", description: "Two large before-and-after panels" },
  { id: "blank", label: "Blank Page", description: "No panels for covers or spacer pages" },
];

export function getPanelRects(page: Pick<ComicPage, "layout" | "customGrid">): PanelRect[] {
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
      { x: 0, y: 0, width: 100, height: 48, points: "0,0 100,0 70,48 0,48" },
      { x: 0, y: 52, width: 100, height: 48, points: "30,52 100,52 100,100 0,100" },
    ];
  }

  if (page.layout === "diagonalGrid") {
    return [
      { x: 0, y: 0, width: 64, height: 41, points: "0,0 64,0 58,12 0,41" },
      { x: 48, y: 0, width: 52, height: 72, points: "70,0 100,0 100,46 48,72" },
      { x: 0, y: 20, width: 54, height: 80, points: "0,47 54,20 30,100 0,100" },
      { x: 40, y: 53, width: 60, height: 47, points: "46,80 100,53 100,100 40,100" },
    ];
  }

  if (page.layout === "cinematicSlant") {
    return [
      { x: 0, y: 0, width: 100, height: 40, points: "0,0 100,0 100,24 0,40" },
      { x: 0, y: 38, width: 52, height: 46, points: "0,46 52,38 52,76 0,84" },
      { x: 56, y: 30, width: 44, height: 46, points: "56,37 100,30 100,69 56,76" },
      { x: 0, y: 75, width: 100, height: 25, points: "0,91 100,75 100,100 0,100" },
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
  const index = panels.findIndex((panel) => {
    if (panel.points) {
      return pointInPolygon(pageX, pageY, parsePanelPoints(panel.points));
    }

    return (
      pageX >= panel.x &&
      pageX <= panel.x + panel.width &&
      pageY >= panel.y &&
      pageY <= panel.y + panel.height
    );
  });

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

function parsePanelPoints(points: string) {
  return points.split(" ").map((point) => {
    const [x, y] = point.split(",").map(Number);
    return { x, y };
  });
}

function pointInPolygon(pageX: number, pageY: number, polygon: Array<{ x: number; y: number }>) {
  let inside = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const crossesY = currentPoint.y > pageY !== previousPoint.y > pageY;
    const intersectionX =
      ((previousPoint.x - currentPoint.x) * (pageY - currentPoint.y)) / (previousPoint.y - currentPoint.y) +
      currentPoint.x;

    if (crossesY && pageX < intersectionX) {
      inside = !inside;
    }
  }

  return inside;
}

export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
