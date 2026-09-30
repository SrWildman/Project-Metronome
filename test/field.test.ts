import { describe, expect, it } from 'vitest';
import { describePoint, fromXY, makeField, toXY } from '../src/core/field';

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

  it('places the college back sideline on the last row', () => {
    const loc = { xSteps: 0, ySteps: 0, marker: 3 as const, yardline: 50, front: false, inside: true, side: true };
    expect(toXY(loc, 'college').y).toBe(171);
  });

  it('describes football locations in jargon and other fields in feet', () => {
    expect(describePoint(makeField('highschool'), 192, 0).vertical).toBe('0 steps behind the front sideline');
    expect(describePoint(makeField('gym'), 16, 32).horizontal).toBe('15 ft from the left end');
  });

  it('sizes fields', () => {
    expect(makeField('college').rows).toBe(172);
    expect(makeField('highschool').rows).toBe(169);
    expect(makeField('gym')).toMatchObject({ width: 100, rows: 53, football: false });
    expect(makeField('custom', { lengthFt: 9999, widthFt: 1 })).toMatchObject({ width: 533, rows: 21 });
  });
});

describe('jargon round trip', () => {
  it.each(['highschool', 'college'] as const)('fromXY then toXY returns every %s grid point', (kind) => {
    const { width, rows } = makeField(kind);
    for (let x = 0; x <= width; x++) {
      for (let y = 0; y < rows; y++) {
        expect(toXY(fromXY(x, y, kind), kind)).toEqual({ x, y });
      }
    }
  });
});
