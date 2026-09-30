import { FEET_PER_UNIT } from './field';

export const FPS_PER_MPH = 5280 / 3600;

/** Speed of sound in dry air, in feet per second, at a temperature in °F. */
export const speedOfSound = (tempF: number): number => 49.03 * Math.sqrt(tempF + 459.67);

export interface Point {
  x: number;
  y: number;
}

export const distUnits = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);
export const distFeet = (a: Point, b: Point): number => distUnits(a, b) * FEET_PER_UNIT;

/**
 * Wind vector in feet per second, in field coordinates (x along the field,
 * y toward the back sideline). `toDeg` is the direction the wind blows toward,
 * clockwise from the back sideline: 0 = toward back, 90 = toward +x, 180 = toward front.
 */
export function windVector(mph: number, toDeg: number): Point {
  const rad = (toDeg * Math.PI) / 180;
  const fps = mph * FPS_PER_MPH;
  return { x: fps * Math.sin(rad), y: fps * Math.cos(rad) };
}

/** Seconds for sound to travel from a to b, accounting for wind along the path. */
export function travelTime(a: Point, b: Point, c: number, wind: Point): number {
  const dx = (b.x - a.x) * FEET_PER_UNIT;
  const dy = (b.y - a.y) * FEET_PER_UNIT;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return 0;
  const along = (wind.x * dx + wind.y * dy) / len;
  return len / (c + along);
}

/** Seconds of allowable error: one note of the selected value at the tempo. */
export const errorSeconds = (tempo: number, noteDivisor: number): number =>
  60 / tempo / (noteDivisor / 4);

export const cardinal = (deg: number): string =>
  ['back sideline', 'back / side 2', 'side 2', 'front / side 2', 'front sideline', 'front / side 1', 'side 1', 'back / side 1'][
    Math.round((((deg % 360) + 360) % 360) / 45) % 8
  ];
