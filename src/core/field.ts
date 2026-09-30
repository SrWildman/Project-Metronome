/**
 * Field geometry. Coordinates are in half-steps (one unit = 11.25 in):
 * x runs 0..384 sideline-to-sideline across the length of the field,
 * y runs from the front sideline (0) toward the back sideline.
 */

export type FieldType = 'highschool' | 'college';

/** 0: front sideline, 1: front hash, 2: back hash, 3: back sideline */
export type Marker = 0 | 1 | 2 | 3;

export const X_MAX = 384;

/** Number of y cells on a field (high school hashes are slightly closer together). */
export const fieldRows = (field: FieldType): number => (field === 'college' ? 172 : 169);

export const MARKER_NAMES = ['front sideline', 'front hash', 'back hash', 'back sideline'] as const;

/** Band-jargon description of a point on the field. */
export interface Location {
  /** Steps (0-4 in 0.5 increments, up to 16 outside the end-zone lines) from the yardline. */
  xSteps: number;
  ySteps: number;
  /** true: side 1, false: side 2 */
  side: boolean;
  marker: Marker;
  /** 0-50 in increments of 5 */
  yardline: number;
  inside: boolean;
  /** true: in front of the marker, false: behind it */
  front: boolean;
}

/** Converts x,y coordinates to band jargon. */
export function fromXY(x: number, y: number, field: FieldType): Location {
  const half = X_MAX / 2;
  const side = x <= half;
  const xTmp = side ? x : x - half;
  const yardlineTmp = (xTmp / half) * 12;
  let yardline = side ? yardlineTmp * 5 - 10 : yardlineTmp * -5 + 50;
  if (yardline < 0) yardline = 0;
  yardline = Math.round(yardline / 5) * 5;

  let inside = side ? (xTmp / 2) % 8 < 4 : (xTmp / 2) % 8 <= 4;
  if (!side) inside = !inside;

  let xSteps = (xTmp / 2) % 4;
  if (xSteps === 0 && (xTmp / 4) % 4 !== 0) {
    xSteps = 4;
  } else if (xSteps !== 0 && !((inside && side) || (!inside && !side))) {
    xSteps = 4 - xSteps;
  }

  if (x < 32 || x > 352) {
    xSteps = side ? 16 - xTmp / 2 : xTmp / 2 - 80;
    inside = false;
  }

  let ySteps: number;
  let front: boolean;
  let marker: Marker;
  if (field === 'college') {
    if (y < 32) [ySteps, front, marker] = [y / 2, false, 0];
    else if (y < 64) [ySteps, front, marker] = [32 - y / 2, true, 1];
    else if (y < 107) [ySteps, front, marker] = [(y - 64) / 2, false, 1];
    else if (y < 139) [ySteps, front, marker] = [(y - 107) / 2, false, 2];
    else [ySteps, front, marker] = [32 - (y - 107) / 2, true, 3];
  } else {
    if (y < 28) [ySteps, front, marker] = [y / 2, false, 0];
    else if (y < 56) [ySteps, front, marker] = [28 - y / 2, true, 1];
    else if (y < 84) [ySteps, front, marker] = [(y - 56) / 2, false, 1];
    else if (y < 112) [ySteps, front, marker] = [28 - (y - 56) / 2, true, 2];
    else if (y < 140) [ySteps, front, marker] = [(y - 112) / 2, false, 2];
    else [ySteps, front, marker] = [28 - (y - 112) / 2, true, 3];
  }

  return { xSteps, ySteps, side, marker, yardline, inside, front };
}

/** Human-readable name for a location, e.g. "2 steps inside the S1 45 yardline". */
export function describeLocation(loc: Location): { horizontal: string; vertical: string } {
  return {
    horizontal: `${loc.xSteps} steps ${loc.inside ? 'inside' : 'outside'} the ${
      loc.side ? 'S1' : 'S2'
    } ${loc.yardline} yardline`,
    vertical: `${loc.ySteps} steps ${loc.front ? 'in front of' : 'behind'} the ${
      MARKER_NAMES[loc.marker]
    }`,
  };
}

export interface BandLocation {
  xSteps: number;
  ySteps: number;
  marker: Marker;
  yardline: number;
  front: boolean;
  inside: boolean;
  side: boolean;
}

/** Converts band jargon to x,y coordinates. */
export function toXY(loc: BandLocation, field: FieldType): { x: number; y: number } {
  const { xSteps, ySteps, marker, yardline, front, inside, side } = loc;

  const yardUnits = side ? (yardline + 10) / 5 : (50 - yardline) / 5;
  let x = yardUnits * 16;
  if (!side) x += X_MAX / 2;
  // "inside" points toward the 50 on side 1 and away from it on side 2
  x += (inside === side ? 1 : -1) * xSteps * 2;

  let y: number;
  if (field === 'college') {
    y = marker < 2 ? 64 * marker : marker < 3 ? 107 : 172;
  } else {
    y = 56 * marker;
  }
  y += (front ? -1 : 1) * ySteps * 2;

  return { x, y };
}
