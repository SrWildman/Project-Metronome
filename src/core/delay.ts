import { fieldRows, toXY, X_MAX, type FieldType, type Marker } from './field';

/** Feet per half-step, and speed of sound in feet per second. */
const FEET_PER_UNIT = 0.9375;
const SPEED_OF_SOUND = 1150;
const SECONDS_PER_UNIT = FEET_PER_UNIT / SPEED_OF_SOUND;

export interface Point {
  x: number;
  y: number;
}

/** Focal points, in field coordinates (y is off the front sideline). */
export const FOCAL_POINTS = {
  dmp: { label: 'Drum Major Podium', x: 192, y: -20 },
  hspb: { label: 'High School Press Box', x: 192, y: -150 },
  cpb: { label: 'College Press Box', x: 192, y: -200 },
} as const satisfies Record<string, Point & { label: string }>;

export type FocalPointId = keyof typeof FOCAL_POINTS;

/** Zone of a cell, used to pick its color. */
export const Zone = { Green: 0, TimeSource: 1, RingOdd: 2, RingEven: 3 } as const;
export type Zone = (typeof Zone)[keyof typeof Zone];

export interface DelayField {
  field: FieldType;
  width: number;
  height: number;
  /** Extra sound delay (seconds) for a player at each cell, indexed by x * height + y. */
  delays: Float64Array;
  zones: Uint8Array;
}

const dist = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.hypot(x2 - x1, y2 - y1);

/**
 * Seconds of allowable error: the duration of one note of the selected value.
 * @param tempo beats per minute
 * @param noteDivisor 4 = quarter note, 8 = eighth note, ...
 */
export const errorSeconds = (tempo: number, noteDivisor: number): number =>
  60 / tempo / (noteDivisor / 4);

/** Sound delay at (x, y) relative to the time source, as heard by the focal point. */
export function delayAt(timeSource: Point, focalPoint: Point, x: number, y: number): number {
  const direct = dist(timeSource.x, timeSource.y, focalPoint.x, focalPoint.y);
  const viaPoint = dist(timeSource.x, timeSource.y, x, y) + dist(x, y, focalPoint.x, focalPoint.y);
  return SECONDS_PER_UNIT * (viaPoint - direct);
}

/** Computes the delay and zone for every cell of the field. */
export function calculateField(
  timeSource: Point,
  focalPoint: Point,
  error: number,
  field: FieldType,
): DelayField {
  const width = X_MAX;
  const height = fieldRows(field);
  const delays = new Float64Array(width * height);
  const zones = new Uint8Array(width * height);
  const direct = dist(timeSource.x, timeSource.y, focalPoint.x, focalPoint.y);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = x * height + y;
      const delay =
        SECONDS_PER_UNIT *
        (dist(timeSource.x, timeSource.y, x, y) + dist(x, y, focalPoint.x, focalPoint.y) - direct);
      delays[i] = delay;

      if (x === timeSource.x && y === timeSource.y) {
        zones[i] = Zone.TimeSource;
      } else if (delay <= error) {
        zones[i] = Zone.Green;
      } else {
        // Rings are concentric around the focal point, one note of error wide.
        const ringDistance = SECONDS_PER_UNIT * dist(x, y, focalPoint.x, focalPoint.y);
        const ring = Math.floor(ringDistance / error) + 1;
        zones[i] = ring % 2 === 1 ? Zone.RingOdd : Zone.RingEven;
      }
    }
  }

  return { field, width, height, delays, zones };
}

/** Field selections as entered in the UI. */
export interface TimeSourceInput {
  yardLine: number;
  fieldSide: 1 | 2;
  marker: Marker;
  vertical: { whole: number; partial: number; front: boolean };
  horizontal: { whole: number; partial: number; inside: boolean };
}

/** Converts UI selections into field coordinates. */
export function timeSourceToPoint(input: TimeSourceInput, field: FieldType): Point {
  return toXY(
    {
      xSteps: input.horizontal.whole + input.horizontal.partial,
      ySteps: input.vertical.whole + input.vertical.partial,
      marker: input.marker,
      yardline: input.yardLine,
      front: input.vertical.front,
      inside: input.horizontal.inside,
      side: input.fieldSide === 1,
    },
    field,
  );
}
