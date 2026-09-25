import type { ComicPhotoCorners } from "~/lib/comics/types";

export type Point = { x: number; y: number };
export type Corners = ComicPhotoCorners; // top left, top right, bottom right, bottom left

export function deskewSize(points: Corners, width: number, height: number) {
  const length = (a: Point, b: Point) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
  const w = (length(points[0], points[1]) + length(points[3], points[2])) / 2;
  const h = (length(points[0], points[3]) + length(points[1], points[2])) / 2;
  const scale = Math.min(1, 1800 / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

export function mapSquareToQuad(points: Corners) {
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
  if (points.some((point, index) => cross(point, points[(index + 1) % 4], points[(index + 2) % 4]) < 0.001)) {
    throw new Error("Move the four corners around the page in order, without crossing the lines.");
  }
  const [a, b, c, d] = points;
  const dx = a.x - b.x + c.x - d.x;
  const dy = a.y - b.y + c.y - d.y;
  const ux = b.x - c.x;
  const uy = b.y - c.y;
  const vx = d.x - c.x;
  const vy = d.y - c.y;
  const divisor = ux * vy - vx * uy;
  if (Math.abs(divisor) < 1e-6) throw new Error("Move the corners to outline a rectangular page.");
  const g = (dx * vy - vx * dy) / divisor;
  const h = (ux * dy - dx * uy) / divisor;
  return (u: number, v: number): Point => {
    const denominator = g * u + h * v + 1;
    return {
      x: ((b.x - a.x + g * b.x) * u + (d.x - a.x + h * d.x) * v + a.x) / denominator,
      y: ((b.y - a.y + g * b.y) * u + (d.y - a.y + h * d.y) * v + a.y) / denominator,
    };
  };
}

export function deskewPixels(source: ImageData, points: Corners): ImageData {
  const size = deskewSize(points, source.width, source.height);
  const output = new ImageData(size.width, size.height);
  const map = mapSquareToQuad(points);
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      const point = map((x + 0.5) / size.width, (y + 0.5) / size.height);
      const sx = Math.max(0, Math.min(source.width - 1, point.x * source.width - 0.5));
      const sy = Math.max(0, Math.min(source.height - 1, point.y * source.height - 0.5));
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, source.width - 1);
      const y1 = Math.min(y0 + 1, source.height - 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const dest = (y * size.width + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const top = source.data[(y0 * source.width + x0) * 4 + channel] * (1 - fx)
          + source.data[(y0 * source.width + x1) * 4 + channel] * fx;
        const bottom = source.data[(y1 * source.width + x0) * 4 + channel] * (1 - fx)
          + source.data[(y1 * source.width + x1) * 4 + channel] * fx;
        output.data[dest + channel] = top * (1 - fy) + bottom * fy;
      }
    }
  }
  return output;
}
