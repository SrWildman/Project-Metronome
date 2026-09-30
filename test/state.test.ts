import { describe, expect, it } from 'vitest';
import { decodeState, defaultState, encodeState } from '../src/core/state';

describe('URL state', () => {
  it('round-trips the default state', () => {
    const s = defaultState();
    expect(decodeState(encodeState(s))).toEqual(s);
  });

  it('round-trips a customized state', () => {
    const s = {
      ...defaultState(),
      fieldKind: 'custom' as const,
      customLengthFt: 150,
      customWidthFt: 80,
      timeSources: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
      focalPoint: { x: 5.5, y: -25 },
      probe: { x: 12, y: 30 },
      tempos: [{ label: 'Opener, fast', bpm: 180 }, { label: 'Ballad', bpm: 72 }],
      activeTempo: 1,
      noteDivisor: 16,
      tempF: 55,
      windMph: 12,
      windToDeg: 270,
      patterns: true,
    };
    expect(decodeState(encodeState(s))).toEqual(s);
  });

  it('falls back to defaults for garbage and clamps out-of-range values', () => {
    expect(decodeState('f=zzz&ts=abc&fp=nan&n=7&at=99&temp=9999&t=x')).toMatchObject({
      fieldKind: 'highschool',
      noteDivisor: 64,
      activeTempo: 0,
      tempF: 120,
    });
    expect(decodeState('')).toEqual(defaultState());
  });

  it('accepts full field names as well as short codes', () => {
    expect(decodeState('f=college').fieldKind).toBe('college');
    expect(decodeState('f=col').fieldKind).toBe('college');
  });

  it('keeps time sources and the probe on the field', () => {
    const s = decodeState('ts=9999,9999&pr=-5,-5');
    expect(s.timeSources[0].x).toBeLessThan(384);
    expect(s.probe).toEqual({ x: 0, y: 0 });
  });
});
