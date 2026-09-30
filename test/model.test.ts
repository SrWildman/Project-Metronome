import { describe, expect, it } from 'vitest';
import { makeField } from '../src/core/field';
import {
  createModel,
  explainAt,
  fieldStats,
  guidanceAt,
  toCounts,
  Zone,
  type Scenario,
} from '../src/core/model';
import { errorSeconds, speedOfSound, travelTime, windVector } from '../src/core/physics';

const base = (over: Partial<Scenario> = {}): Scenario => ({
  field: makeField('highschool'),
  timeSources: [{ x: 192, y: 56 }],
  focalPoint: { x: 192, y: -150 },
  tempo: 160,
  noteDivisor: 64,
  tempF: 72,
  windMph: 0,
  windToDeg: 0,
  ...over,
});

describe('physics', () => {
  it('speed of sound follows temperature (~1126 ft/s at 68°F)', () => {
    expect(speedOfSound(68)).toBeCloseTo(1126, 0);
    expect(speedOfSound(90)).toBeGreaterThan(speedOfSound(50));
  });

  it('converts tempo and note value to seconds of error', () => {
    expect(errorSeconds(120, 4)).toBeCloseTo(0.5);
    expect(errorSeconds(120, 8)).toBeCloseTo(0.25);
  });

  it('wind blowing along the path speeds sound up, against it slows it down', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 100 };
    const c = 1126;
    const calm = travelTime(a, b, c, windVector(0, 0));
    expect(travelTime(a, b, c, windVector(20, 0))).toBeLessThan(calm); // toward +y, same as path
    expect(travelTime(a, b, c, windVector(20, 180))).toBeGreaterThan(calm);
    expect(travelTime(a, b, c, windVector(20, 90))).toBeCloseTo(calm, 3); // crosswind
  });
});

describe('delay model', () => {
  it('has no delay on the straight line between time source and focal point', () => {
    const m = createModel(base({ timeSources: [{ x: 0, y: 0 }], focalPoint: { x: 0, y: -100 } }));
    expect(m.evaluate(0, -50).delay).toBeCloseTo(0, 9);
  });

  it('is green at the time source and grows with distance from the line of sound', () => {
    const m = createModel(base());
    expect(m.zoneOf(m.evaluate(192, 56))).toBe(Zone.Green);
    expect(m.evaluate(20, 150).delay).toBeGreaterThan(m.evaluate(100, 100).delay);
  });

  it('temperature changes delays', () => {
    const cold = createModel(base({ tempF: 20 })).evaluate(20, 150).delay;
    const hot = createModel(base({ tempF: 100 })).evaluate(20, 150).delay;
    expect(cold).toBeGreaterThan(hot);
  });

  it('players follow the best of several time sources', () => {
    const one = createModel(base({ timeSources: [{ x: 192, y: 56 }] }));
    const two = createModel(base({ timeSources: [{ x: 192, y: 56 }, { x: 40, y: 140 }] }));
    const near = two.evaluate(40, 140);
    expect(near.source).toBe(1);
    expect(near.delay).toBeCloseTo(0, 9);
    expect(near.delay).toBeLessThan(one.evaluate(40, 140).delay);
  });

  it('uses both ring parities away from the focal point', () => {
    const m = createModel(base({ noteDivisor: 128 }));
    const zones = new Set<number>();
    for (let y = 0; y < 169; y += 3) zones.add(m.zoneOf(m.evaluate(20, y)));
    expect(zones.has(Zone.RingOdd) && zones.has(Zone.RingEven)).toBe(true);
  });

  it('counts delay in beats', () => {
    expect(toCounts(0.375, 160)).toBeCloseTo(1);
  });

  it('explains a point with consistent numbers', () => {
    const m = createModel(base());
    const e = explainAt(m, 40, 150);
    const [toPlayer, toFocal, direct] = e.legs;
    expect(toPlayer.seconds + toFocal.seconds - direct.seconds).toBeCloseTo(e.delay, 9);
  });
});

describe('fast evaluation', () => {
  it.each([0, 12])('matches the readable travel-time math (wind %i mph)', (windMph) => {
    const scenario = base({ windMph, windToDeg: 130, timeSources: [{ x: 192, y: 56 }, { x: 40, y: 140 }] });
    const m = createModel(scenario);
    for (const [x, y] of [[0, 0], [192, 56], [40, 140], [300, 20], [10, 168], [192, -150]]) {
      const e = explainAt(m, x, y);
      const ev = m.evaluate(x, y);
      expect(ev.delay).toBeCloseTo(e.delay, 12);
      expect(ev.arrival).toBeCloseTo(e.legs[1].seconds, 12);
    }
  });
});

describe('guidance', () => {
  it('tells players in the green zone to play with the time source', () => {
    const m = createModel(base());
    expect(guidanceAt(m, 192, 60)).toEqual({ kind: 'time-source' });
  });

  it('gives ahead/behind guidance outside the green zone', () => {
    const m = createModel(base({ noteDivisor: 128, tempo: 200 }));
    let shifted = 0;
    for (let y = 0; y < 169; y += 4) {
      const g = guidanceAt(m, 20, y);
      if (g.kind === 'ahead' || g.kind === 'behind') shifted++;
    }
    expect(shifted).toBeGreaterThan(0);
  });
});

describe('field stats', () => {
  it('reports a green fraction between 0 and 1 that shrinks with tighter error', () => {
    const m = createModel(base());
    const stats = fieldStats(m);
    const loose = stats.greenFraction(errorSeconds(160, 4));
    const tight = stats.greenFraction(errorSeconds(160, 256));
    expect(loose).toBeGreaterThan(tight);
    expect(tight).toBeGreaterThan(0);
    expect(loose).toBeLessThanOrEqual(1);
    expect(stats.maxDelay).toBeGreaterThan(0);
  });
});
