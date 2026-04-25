import type { ComicPaperSize } from "~/lib/comics/types";

export type ComicPaperSizeOption = {
  id: ComicPaperSize;
  label: string;
  description: string;
  width: number;
  height: number;
};

export const defaultPaperSize: ComicPaperSize = "letter-portrait";

export const paperSizeOptions: ComicPaperSizeOption[] = [
  {
    id: "letter-portrait",
    label: "Letter",
    description: '8.5" x 11"',
    width: 8.5,
    height: 11,
  },
  {
    id: "letter-landscape",
    label: "Letter Wide",
    description: '11" x 8.5"',
    width: 11,
    height: 8.5,
  },
  {
    id: "half-portrait",
    label: "Half Sheet",
    description: '5.5" x 8.5"',
    width: 5.5,
    height: 8.5,
  },
  {
    id: "half-landscape",
    label: "Half Sheet Wide",
    description: '8.5" x 5.5"',
    width: 8.5,
    height: 5.5,
  },
];

export function getPaperSizeOption(size: ComicPaperSize | undefined) {
  return paperSizeOptions.find((option) => option.id === size) ?? paperSizeOptions[0];
}
