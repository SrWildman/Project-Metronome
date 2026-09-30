import { type Model, type Evaluation, Zone } from './model';

/** Okabe-Ito colors: distinguishable with all common forms of color blindness. */
export const ZONE_RGB: Record<Zone, readonly [number, number, number]> = {
  [Zone.Green]: [0, 158, 115],
  [Zone.RingOdd]: [230, 159, 0],
  [Zone.RingEven]: [86, 180, 233],
};

export const ZONE_HEX: Record<Zone, string> = {
  [Zone.Green]: '#009e73',
  [Zone.RingOdd]: '#e69f00',
  [Zone.RingEven]: '#56b4e9',
};

export const OVERLAY_ALPHA = 0.74;

/** Region of the field shown on the map, in half-steps. */
export interface MapView {
  width: number;
  rows: number;
  /** extra rows shown in front of (below) the field */
  margin: number;
}

export const viewSpan = (v: MapView): number => v.rows + v.margin;

/** Fraction of the map (0..1) from the left / top for a field point. Cells are centered on integers. */
export const toViewX = (v: MapView, x: number): number => (x + 0.5) / v.width;
export const toViewY = (v: MapView, y: number): number => (v.rows - 0.5 - y) / viewSpan(v);
export const fromViewX = (v: MapView, fx: number): number => fx * v.width - 0.5;
export const fromViewY = (v: MapView, fy: number): number => v.rows - 0.5 - fy * viewSpan(v);

const ev: Evaluation = { delay: 0, source: 0, arrival: 0 };

/**
 * Paints the delay map at pixel resolution on the CPU (no WebGL/GPU needed).
 * Every pixel is evaluated analytically, so the map is smooth at any size.
 */
export function renderMap(
  canvas: HTMLCanvasElement,
  model: Model,
  view: MapView,
  pixelWidth: number,
  patterns: boolean,
): void {
  const W = Math.max(1, Math.round(pixelWidth));
  const H = Math.max(1, Math.round((W * viewSpan(view)) / view.width));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const zones = new Uint8Array(W * H);
  const image = ctx.createImageData(W, H);
  const data = image.data;
  const alpha = Math.round(OVERLAY_ALPHA * 255);

  for (let py = 0; py < H; py++) {
    const y = fromViewY(view, (py + 0.5) / H);
    for (let px = 0; px < W; px++) {
      const x = fromViewX(view, (px + 0.5) / W);
      const zone = model.zoneOf(model.evaluateInto(x, y, ev));
      const i = py * W + px;
      zones[i] = zone;

      let [r, g, b] = ZONE_RGB[zone];
      if (patterns) {
        // Non-color cues: dots in the green zone, diagonal stripes in odd rings.
        const lighten =
          zone === Zone.Green
            ? (px % 8 < 2 && py % 8 < 2)
            : zone === Zone.RingOdd
              ? (px + py) % 10 < 3
              : false;
        if (lighten) [r, g, b] = [255, 255, 255];
      }
      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = alpha;
    }
  }

  // Outline every boundary between zones.
  for (let py = 0; py < H - 1; py++) {
    for (let px = 0; px < W - 1; px++) {
      const i = py * W + px;
      if (zones[i] !== zones[i + 1] || zones[i] !== zones[i + W]) {
        const o = i * 4;
        data[o] = data[o + 1] = data[o + 2] = 255;
        data[o + 3] = 235;
      }
    }
  }

  ctx.putImageData(image, 0, 0);
}
