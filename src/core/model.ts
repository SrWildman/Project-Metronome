import { FEET_PER_UNIT, type FieldSpec } from './field';
import {
  distFeet,
  errorSeconds,
  speedOfSound,
  travelTime,
  windVector,
  type Point,
} from './physics';

export type { Point };

/** Everything that determines the sound-delay map. */
export interface Scenario {
  field: FieldSpec;
  /** Sound sources players listen to (metronome, drumline, speakers...). Players follow the best one. */
  timeSources: Point[];
  /** Where the sound needs to line up (audience, press box, drum major podium). */
  focalPoint: Point;
  tempo: number;
  /** 4 = quarter note, 8 = eighth note, ... */
  noteDivisor: number;
  tempF: number;
  windMph: number;
  /** Direction the wind blows toward, degrees clockwise from the back sideline. */
  windToDeg: number;
}

/** Zone of a point, used to pick its color. */
export const Zone = { Green: 0, RingOdd: 1, RingEven: 2 } as const;
export type Zone = (typeof Zone)[keyof typeof Zone];

/** Reusable result holder so per-pixel evaluation doesn't allocate. */
export interface Evaluation {
  /** Extra seconds this point's sound takes to reach the focal point, following the best time source. */
  delay: number;
  /** Index of the time source that gives the smallest delay. */
  source: number;
  /** Seconds for sound to travel from this point to the focal point. */
  arrival: number;
}

export interface Model {
  scenario: Scenario;
  soundSpeed: number;
  /** Seconds of allowable error (also the width of each ring). */
  error: number;
  evaluateInto(x: number, y: number, out: Evaluation): Evaluation;
  evaluate(x: number, y: number): Evaluation;
  ringOf(arrival: number): number;
  zoneOf(ev: Evaluation): Zone;
}

export function createModel(scenario: Scenario): Model {
  const c = speedOfSound(scenario.tempF);
  const wind = windVector(scenario.windMph, scenario.windToDeg);
  const error = errorSeconds(scenario.tempo, scenario.noteDivisor);
  const fp = scenario.focalPoint;
  const sources = scenario.timeSources;
  const direct = sources.map((ts) => travelTime(ts, fp, c, wind));

  // Everything below is travelTime() inlined over plain arrays: this runs for every
  // pixel of the map, so it avoids allocation and function calls. Tests keep the two in step.
  const k = FEET_PER_UNIT;
  const sx = Float64Array.from(sources, (s) => s.x * k);
  const sy = Float64Array.from(sources, (s) => s.y * k);
  const fx = fp.x * k;
  const fy = fp.y * k;
  const windy = wind.x !== 0 || wind.y !== 0;
  const wx = wind.x;
  const wy = wind.y;
  const n = sources.length;

  const evaluateInto = (x: number, y: number, out: Evaluation): Evaluation => {
    const px = x * k;
    const py = y * k;
    let dx = fx - px;
    let dy = fy - py;
    let len = Math.sqrt(dx * dx + dy * dy);
    const arrival = len === 0 ? 0 : windy ? len / (c + (wx * dx + wy * dy) / len) : len / c;

    let best = Infinity;
    let bestIndex = 0;
    for (let i = 0; i < n; i++) {
      dx = px - sx[i];
      dy = py - sy[i];
      len = Math.sqrt(dx * dx + dy * dy);
      const t = len === 0 ? 0 : windy ? len / (c + (wx * dx + wy * dy) / len) : len / c;
      const d = t + arrival - direct[i];
      if (d < best) {
        best = d;
        bestIndex = i;
      }
    }
    out.delay = best;
    out.source = bestIndex;
    out.arrival = arrival;
    return out;
  };

  // Rings are concentric around the focal point, one note of error wide.
  const ringOf = (arrival: number) => Math.floor(arrival / error) + 1;

  return {
    scenario,
    soundSpeed: c,
    error,
    evaluateInto,
    evaluate: (x, y) => evaluateInto(x, y, { delay: 0, source: 0, arrival: 0 }),
    ringOf,
    zoneOf: (ev) =>
      ev.delay <= error ? Zone.Green : ringOf(ev.arrival) % 2 === 1 ? Zone.RingOdd : Zone.RingEven,
  };
}

export type Guidance =
  | { kind: 'time-source' }
  | { kind: 'conductor' }
  | { kind: 'ahead'; notes: number }
  | { kind: 'behind'; notes: number };

/** What a player at this point should do, in the terms directors use. */
export function guidanceAt(model: Model, x: number, y: number): Guidance {
  const ev = model.evaluate(x, y);
  if (ev.delay <= model.error) return { kind: 'time-source' };
  const ts = model.scenario.timeSources[ev.source];
  const tsRing = model.ringOf(
    travelTime(ts, model.scenario.focalPoint, model.soundSpeed, windVector(model.scenario.windMph, model.scenario.windToDeg)),
  );
  const diff = model.ringOf(ev.arrival) - tsRing;
  if (diff === 0) return { kind: 'conductor' };
  return diff > 0 ? { kind: 'ahead', notes: diff } : { kind: 'behind', notes: -diff };
}

export interface Explanation {
  soundSpeed: number;
  source: number;
  /** feet, and seconds at the actual speed of sound including wind */
  legs: { label: string; feet: number; seconds: number }[];
  delay: number;
  error: number;
  ring: number;
  sourceRing: number;
}

/** Step-by-step numbers behind a single point's delay. */
export function explainAt(model: Model, x: number, y: number): Explanation {
  const { scenario, soundSpeed: c } = model;
  const wind = windVector(scenario.windMph, scenario.windToDeg);
  const ev = model.evaluate(x, y);
  const ts = scenario.timeSources[ev.source];
  const p = { x, y };
  const fp = scenario.focalPoint;
  return {
    soundSpeed: c,
    source: ev.source,
    legs: [
      { label: 'Time source → player', feet: distFeet(ts, p), seconds: travelTime(ts, p, c, wind) },
      { label: 'Player → focal point', feet: distFeet(p, fp), seconds: travelTime(p, fp, c, wind) },
      { label: 'Time source → focal point (direct)', feet: distFeet(ts, fp), seconds: travelTime(ts, fp, c, wind) },
    ],
    delay: ev.delay,
    error: model.error,
    ring: model.ringOf(ev.arrival),
    sourceRing: model.ringOf(travelTime(ts, fp, c, wind)),
  };
}

export interface FieldStats {
  /** Largest delay anywhere on the field, seconds. */
  maxDelay: number;
  /** Fraction of the field where players may play with the time source, for a given allowable error. */
  greenFraction(error: number): number;
}

/**
 * Scans the field on a half-step grid once. Delays don't depend on tempo, so the
 * result can answer "how big is the green zone?" for any allowable error.
 */
export function fieldStats(model: Model): FieldStats {
  const { width, rows } = model.scenario.field;
  const ev: Evaluation = { delay: 0, source: 0, arrival: 0 };
  const delays = new Float64Array(width * rows);
  let i = 0;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < rows; y++) delays[i++] = model.evaluateInto(x, y, ev).delay;
  }
  delays.sort();
  return {
    maxDelay: delays[delays.length - 1] ?? 0,
    greenFraction(error) {
      let lo = 0;
      let hi = delays.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (delays[mid] <= error) lo = mid + 1;
        else hi = mid;
      }
      return lo / delays.length;
    },
  };
}

export const feet = (units: number): number => units * FEET_PER_UNIT;

/** Delay in beats at a tempo. */
export const toCounts = (seconds: number, tempo: number): number => seconds / (60 / tempo);

export const formatMs = (seconds: number): string => `${Math.round(seconds * 1000)} ms`;
