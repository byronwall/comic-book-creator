export type ComicLayoutKind =
  | "four"
  | "bigTop"
  | "threeStack"
  | "wideMiddle"
  | "splashLeft"
  | "six"
  | "custom";

export type ComicTextKind = "speech" | "thought" | "caption" | "sfx";

export type ComicTextAlign = "left" | "center" | "right";
export type ComicTextPositionScope = "panel" | "page";

export interface ComicTextElement {
  id: string;
  kind: ComicTextKind;
  text: string;
  panelIndex: number;
  positionScope?: ComicTextPositionScope;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  align: ComicTextAlign;
}

export interface ComicTemplateGrid {
  verticalLines: number[];
  horizontalLines: number[];
}

export interface ComicPage {
  id: string;
  title: string;
  status: "Blank" | "Draft" | "Ready";
  layout: ComicLayoutKind;
  customGrid?: ComicTemplateGrid;
  texts: ComicTextElement[];
}

export interface ComicBook {
  id: string;
  title: string;
  updatedAt: string;
  pages: ComicPage[];
}

export interface ComicBookSummary {
  id: string;
  title: string;
  updatedAt: string;
  pageCount: number;
}
