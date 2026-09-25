import { describe, expect, it } from "vitest";
import { deskewPixels, deskewSize, mapSquareToQuad, type Corners } from "./deskew-photo";

describe("photo deskew", () => {
  it("maps a skewed page to a rectangle and keeps its page shape", () => {
    const corners: Corners = [
      { x: 0.1, y: 0.1 }, { x: 0.8, y: 0.05 },
      { x: 0.95, y: 0.9 }, { x: 0.2, y: 0.8 },
    ];
    const map = mapSquareToQuad(corners);
    expect(map(0, 0)).toEqual(corners[0]);
    expect(map(1, 0).x).toBeCloseTo(corners[1].x);
    expect(map(1, 1).y).toBeCloseTo(corners[2].y);
    expect(map(0, 1).x).toBeCloseTo(corners[3].x);
    const size = deskewSize(corners, 1200, 1600);
    expect(size.height).toBeGreaterThan(size.width);
    expect(() => mapSquareToQuad([corners[0], corners[2], corners[1], corners[3]])).toThrow();
  });

  it("copies only pixels inside the selected corners", () => {
    const originalImageData = globalThis.ImageData;
    globalThis.ImageData = class {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    } as typeof ImageData;
    try {
      const source = new ImageData(10, 10);
      for (let y = 2; y < 8; y++) for (let x = 2; x < 8; x++) {
        source.data[(y * 10 + x) * 4] = 200;
      }
      const result = deskewPixels(source, [
        { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 },
        { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 },
      ]);
      expect([result.width, result.height]).toEqual([6, 6]);
      expect(result.data[0]).toBe(200);
      expect(result.data[(6 * 6 - 1) * 4]).toBe(200);
    } finally {
      globalThis.ImageData = originalImageData;
    }
  });
});
