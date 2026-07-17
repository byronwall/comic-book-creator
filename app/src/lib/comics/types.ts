export type ComicLayoutKind =
  | "four"
  | "bigTop"
  | "threeStack"
  | "wideMiddle"
  | "splashLeft"
  | "six"
  | "splashInset"
  | "threeVertical"
  | "fourStrip"
  | "revealBottom"
  | "heroRight"
  | "diagonalAction"
  | "diagonalGrid"
  | "cinematicSlant"
  | "letterbox"
  | "establishingDialogue"
  | "webtoonStack"
  | "doubleFeature"
  | "blank"
  | "custom";

export type ComicTextKind = "speech" | "thought" | "caption" | "sfx";
export type ComicPaperSize = "letter-portrait" | "letter-landscape" | "half-portrait" | "half-landscape";

export type ComicTextAlign = "left" | "center" | "right";
export type ComicTextPositionScope = "panel" | "page";
export type ComicPageMode = "comic" | "image";
export type ComicImageTreatment = "color" | "grayscale" | "threshold";

export interface ComicPageImage {
  id: string;
  src: string;
  filename: string;
  originalName: string;
  mimeType: string;
  treatment: ComicImageTreatment;
  brightness: number;
  contrast: number;
  threshold: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  fit: "contain" | "cover";
}

export interface ComicTextElement {
  id: string;
  kind: ComicTextKind;
  text: string;
  panelIndex: number;
  positionScope?: ComicTextPositionScope;
  x: number;
  y: number;
  width: number;
  height?: number;
  fontSize: number;
  rotation?: number;
  align: ComicTextAlign;
  autoWrap?: boolean;
}

export interface ComicTemplateGrid {
  verticalLines: number[];
  horizontalLines: number[];
}

export interface ComicPage {
  id: string;
  title: string;
  cover?: boolean;
  status: "Blank" | "Draft" | "Ready";
  layout: ComicLayoutKind;
  mode?: ComicPageMode;
  images?: ComicPageImage[];
  /** Legacy single-image field, migrated to images when read. */
  image?: ComicPageImage;
  paperSize?: ComicPaperSize;
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
