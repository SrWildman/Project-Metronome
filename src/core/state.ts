import { makeField, X_MAX, type FieldKind, type FieldSpec } from './field';
import type { Point, Scenario } from './model';

export interface TempoSection {
  label: string;
  bpm: number;
}

/** Everything the user can change; this is what gets saved in the URL. */
export interface AppState {
  fieldKind: FieldKind;
  customLengthFt: number;
  customWidthFt: number;
  timeSources: Point[];
  focalPoint: Point;
  /** A player position used for the detailed readout and audio demo. */
  probe: Point;
  tempos: TempoSection[];
  activeTempo: number;
  noteDivisor: number;
  tempF: number;
  windMph: number;
  windToDeg: number;
  patterns: boolean;
}

export const FOCAL_PRESETS = {
  dmp: { label: 'Drum major podium', x: 192, y: -20 },
  hspb: { label: 'High school press box', x: 192, y: -150 },
  cpb: { label: 'College press box', x: 192, y: -200 },
} as const;

export const NOTE_DIVISORS = [4, 8, 16, 32, 64, 128, 256] as const;
export const MAX_TIME_SOURCES = 6;
export const MAX_TEMPOS = 8;
export const TEMPO_LIMITS = { min: 20, max: 300 } as const;
export const TEMP_LIMITS = { min: -20, max: 120 } as const;
export const WIND_LIMITS = { min: 0, max: 40 } as const;
/** Focal points may sit this far (in half-steps) outside the field. */
export const FOCAL_RANGE = 600;

/** Extra map area shown in front of the field so the focal point can be dragged into view. */
export const viewMargin = (field: FieldSpec): number => (field.football ? 60 : 30);

export const fieldOf = (s: AppState): FieldSpec =>
  makeField(s.fieldKind, { lengthFt: s.customLengthFt, widthFt: s.customWidthFt });

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Places the default layout for a field. */
export function layoutFor(field: FieldSpec): Pick<AppState, 'timeSources' | 'focalPoint' | 'probe'> {
  if (field.football) {
    return {
      timeSources: [{ x: X_MAX / 2, y: 56 }],
      focalPoint: { x: FOCAL_PRESETS.hspb.x, y: FOCAL_PRESETS.hspb.y },
      probe: { x: 96, y: Math.round(field.rows * 0.6) },
    };
  }
  return {
    timeSources: [{ x: Math.round(field.width / 2), y: Math.round(field.rows / 2) }],
    focalPoint: { x: Math.round(field.width / 2), y: -20 },
    probe: { x: Math.round(field.width * 0.25), y: Math.round(field.rows * 0.7) },
  };
}

export function defaultState(): AppState {
  const field = makeField('highschool');
  return {
    fieldKind: 'highschool',
    customLengthFt: 200,
    customWidthFt: 100,
    ...layoutFor(field),
    tempos: [{ label: 'Tempo', bpm: 160 }],
    activeTempo: 0,
    noteDivisor: 64,
    tempF: 72,
    windMph: 0,
    windToDeg: 0,
    patterns: false,
  };
}

export const toScenario = (s: AppState): Scenario => ({
  field: fieldOf(s),
  timeSources: s.timeSources,
  focalPoint: s.focalPoint,
  tempo: s.tempos[s.activeTempo]?.bpm ?? 120,
  noteDivisor: s.noteDivisor,
  tempF: s.tempF,
  windMph: s.windMph,
  windToDeg: s.windToDeg,
});

/** Keeps a point on the field, snapped to the half-step grid. */
export const snapToField = (p: Point, field: FieldSpec): Point => ({
  x: clamp(Math.round(p.x), 0, field.width - 1),
  y: clamp(Math.round(p.y), 0, field.rows - 1),
});

// ---- URL serialization -------------------------------------------------

const KIND_CODES: Record<FieldKind, string> = {
  highschool: 'hs',
  college: 'col',
  gym: 'gym',
  custom: 'custom',
};

const fmt = (n: number) => String(Math.round(n * 100) / 100);
const fmtPoint = (p: Point) => `${fmt(p.x)},${fmt(p.y)}`;

export function encodeState(s: AppState): string {
  const q = new URLSearchParams();
  q.set('f', KIND_CODES[s.fieldKind]);
  if (s.fieldKind === 'custom') {
    q.set('l', fmt(s.customLengthFt));
    q.set('w', fmt(s.customWidthFt));
  }
  q.set('ts', s.timeSources.map(fmtPoint).join('~'));
  q.set('fp', fmtPoint(s.focalPoint));
  q.set('pr', fmtPoint(s.probe));
  q.set(
    't',
    s.tempos.map((t) => `${encodeURIComponent(t.label)}:${fmt(t.bpm)}`).join(','),
  );
  q.set('at', String(s.activeTempo));
  q.set('n', String(s.noteDivisor));
  q.set('temp', fmt(s.tempF));
  q.set('wind', fmt(s.windMph));
  q.set('wdir', fmt(s.windToDeg));
  if (s.patterns) q.set('pat', '1');
  return q.toString();
}

function parsePoint(text: string | null): Point | null {
  if (!text) return null;
  const [x, y] = text.split(',').map(Number);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

const num = (text: string | null, lo: number, hi: number, fallback: number): number => {
  const v = text === null || text === '' ? NaN : Number(text);
  return Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
};

/** Builds state from a query string, falling back to defaults for anything missing or invalid. */
export function decodeState(search: string): AppState {
  const q = new URLSearchParams(search);
  const base = defaultState();

  const code = q.get('f');
  const fieldKind = (Object.keys(KIND_CODES) as FieldKind[]).find((k) => KIND_CODES[k] === code || k === code) ?? base.fieldKind;
  const customLengthFt = num(q.get('l'), 20, 500, base.customLengthFt);
  const customWidthFt = num(q.get('w'), 20, 500, base.customWidthFt);
  const field = makeField(fieldKind, { lengthFt: customLengthFt, widthFt: customWidthFt });
  const layout = layoutFor(field);

  const timeSources = (q.get('ts') ?? '')
    .split('~')
    .map(parsePoint)
    .filter((p): p is Point => p !== null)
    .slice(0, MAX_TIME_SOURCES)
    .map((p) => snapToField(p, field));

  const fp = parsePoint(q.get('fp'));
  const probe = parsePoint(q.get('pr'));

  const tempos = (q.get('t') ?? '')
    .split(',')
    .map((part) => {
      const i = part.lastIndexOf(':');
      const bpm = Number(part.slice(i + 1));
      if (i < 0 || !Number.isFinite(bpm)) return null;
      let label = part.slice(0, i);
      try {
        label = decodeURIComponent(label);
      } catch {
        /* keep raw label */
      }
      return { label: label.slice(0, 40) || 'Tempo', bpm: clamp(bpm, TEMPO_LIMITS.min, TEMPO_LIMITS.max) };
    })
    .filter((t): t is TempoSection => t !== null)
    .slice(0, MAX_TEMPOS);
  const noteDivisor = Number(q.get('n'));

  return {
    fieldKind,
    customLengthFt,
    customWidthFt,
    timeSources: timeSources.length ? timeSources : layout.timeSources,
    focalPoint: fp
      ? { x: clamp(fp.x, -FOCAL_RANGE, field.width + FOCAL_RANGE), y: clamp(fp.y, -FOCAL_RANGE, field.rows + FOCAL_RANGE) }
      : layout.focalPoint,
    probe: probe ? snapToField(probe, field) : layout.probe,
    tempos: tempos.length ? tempos : base.tempos,
    activeTempo: clamp(Math.round(num(q.get('at'), 0, 100, 0)), 0, Math.max(0, (tempos.length || 1) - 1)),
    noteDivisor: (NOTE_DIVISORS as readonly number[]).includes(noteDivisor) ? noteDivisor : base.noteDivisor,
    tempF: num(q.get('temp'), TEMP_LIMITS.min, TEMP_LIMITS.max, base.tempF),
    windMph: num(q.get('wind'), WIND_LIMITS.min, WIND_LIMITS.max, base.windMph),
    windToDeg: ((num(q.get('wdir'), 0, 360, 0) % 360) + 360) % 360,
    patterns: q.get('pat') === '1',
  };
}
