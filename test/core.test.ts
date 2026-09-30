import { describe, expect, it } from 'vitest';
import {
  calculateField,
  delayAt,
  errorSeconds,
  timeSourceToPoint,
  Zone,
  type TimeSourceInput,
} from '../src/core/delay';
import { describeLocation, fromXY, toXY } from '../src/core/field';

const at50: TimeSourceInput = {
  yardLine: 50,
  fieldSide: 1,
  marker: 1,
  vertical: { whole: 0, partial: 0, front: false },
  horizontal: { whole: 0, partial: 0, inside: true },
};

describe('field geometry', () => {
  it('puts the center of the field on the 50 yardline', () => {
    expect(fromXY(192, 0, 'highschool')).toMatchObject({ yardline: 50, marker: 0 });
  });

  it('picks the marker from y for each field type', () => {
    expect(fromXY(100, 10, 'college').marker).toBe(0);
    expect(fromXY(100, 150, 'college').marker).toBe(3);
    expect(fromXY(100, 100, 'highschool').marker).toBe(2);
  });

  it('round-trips band jargon through toXY/fromXY', () => {
    const { x, y } = toXY(
      { xSteps: 2, ySteps: 3, marker: 2, yardline: 35, front: false, inside: false, side: false },
      'college',
    );
    expect(fromXY(x, y, 'college')).toMatchObject({
      xSteps: 2, ySteps: 3, marker: 2, yardline: 35, front: false, inside: false, side: false,
    });
  });

  it('places the college back sideline independent of any prior calculation', () => {
    calculateField({ x: 0, y: 0 }, { x: 192, y: -150 }, 0.05, 'highschool');
    const loc = { xSteps: 0, ySteps: 0, marker: 3 as const, yardline: 50, front: false, inside: true, side: true };
    expect(toXY(loc, 'college').y).toBe(172);
  });

  it('describes a location in words', () => {
    expect(describeLocation(fromXY(192, 0, 'highschool')).vertical).toBe('0 steps behind the front sideline');
  });
});

describe('delay calculation', () => {
  it('converts tempo and note value to seconds of error', () => {
    expect(errorSeconds(120, 4)).toBeCloseTo(0.5);
    expect(errorSeconds(120, 8)).toBeCloseTo(0.25);
  });

  it('has no delay along the line between time source and focal point', () => {
    expect(delayAt({ x: 0, y: 0 }, { x: 0, y: -100 }, 0, -50)).toBeCloseTo(0);
  });

  it('marks the time source and the green zone', () => {
    const ts = timeSourceToPoint(at50, 'highschool');
    const f = calculateField(ts, { x: 192, y: -150 }, 0.05, 'highschool');
    expect(f.zones[ts.x * f.height + ts.y]).toBe(Zone.TimeSource);
    expect(f.zones[(ts.x + 1) * f.height + ts.y]).toBe(Zone.Green);
  });

  it('alternates ring zones moving away from the focal point', () => {
    const f = calculateField({ x: 192, y: 56 }, { x: 192, y: -150 }, 0.01, 'highschool');
    expect(new Set(f.zones)).toEqual(new Set([Zone.Green, Zone.TimeSource, Zone.RingOdd, Zone.RingEven]));
  });

  it('sizes the grid by field type', () => {
    expect(calculateField({ x: 0, y: 0 }, { x: 0, y: -1 }, 1, 'college').height).toBe(172);
    expect(calculateField({ x: 0, y: 0 }, { x: 0, y: -1 }, 1, 'highschool').height).toBe(169);
  });
});
