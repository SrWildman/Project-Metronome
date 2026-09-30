import { useCallback, useEffect, useMemo, useState } from 'react';
import { makeField, type FieldKind } from '../core/field';
import type { Point } from '../core/model';
import {
  clamp,
  decodeState,
  defaultState,
  encodeState,
  fieldOf,
  FOCAL_RANGE,
  layoutFor,
  MAX_TEMPOS,
  MAX_TIME_SOURCES,
  snapToField,
  TEMPO_LIMITS,
  type AppState,
  type TempoSection,
} from '../core/state';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => decodeState(window.location.search));
  const [selectedTs, setSelectedTs] = useState(0);

  // Keep the URL in sync so the page can be bookmarked or shared as-is.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const url = `${window.location.pathname}?${encodeState(state)}${window.location.hash}`;
      window.history.replaceState(null, '', url);
    }, 250);
    return () => window.clearTimeout(id);
  }, [state]);

  const field = useMemo(() => fieldOf(state), [state]);
  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), []);

  const actions = useMemo(
    () => ({
      patch,
      reset: () => {
        setState(defaultState());
        setSelectedTs(0);
      },
      setFieldKind: (kind: FieldKind) => {
        setState((s) => {
          const next = { ...s, fieldKind: kind };
          return { ...next, ...layoutFor(fieldOf(next)) };
        });
        setSelectedTs(0);
      },
      setCustomSize: (lengthFt: number, widthFt: number) =>
        setState((s) => {
          const next = { ...s, customLengthFt: lengthFt, customWidthFt: widthFt };
          const f = makeField('custom', { lengthFt, widthFt });
          return {
            ...next,
            timeSources: s.timeSources.map((p) => snapToField(p, f)),
            probe: snapToField(s.probe, f),
          };
        }),
      moveTimeSource: (i: number, p: Point) =>
        setState((s) => ({
          ...s,
          timeSources: s.timeSources.map((t, j) => (j === i ? snapToField(p, fieldOf(s)) : t)),
        })),
      addTimeSource: () => {
        setState((s) => {
          if (s.timeSources.length >= MAX_TIME_SOURCES) return s;
          const f = fieldOf(s);
          const last = s.timeSources[s.timeSources.length - 1];
          const p = snapToField({ x: last.x + Math.round(f.width * 0.15), y: last.y }, f);
          return { ...s, timeSources: [...s.timeSources, p] };
        });
        setSelectedTs(state.timeSources.length);
      },
      removeTimeSource: (i: number) => {
        setState((s) =>
          s.timeSources.length > 1 ? { ...s, timeSources: s.timeSources.filter((_, j) => j !== i) } : s,
        );
        setSelectedTs((sel) => Math.max(0, Math.min(sel, state.timeSources.length - 2)));
      },
      moveFocal: (p: Point) =>
        setState((s) => {
          const f = fieldOf(s);
          return {
            ...s,
            focalPoint: {
              x: clamp(Math.round(p.x * 100) / 100, -FOCAL_RANGE, f.width + FOCAL_RANGE),
              y: clamp(Math.round(p.y * 100) / 100, -FOCAL_RANGE, f.rows + FOCAL_RANGE),
            },
          };
        }),
      moveProbe: (p: Point) => setState((s) => ({ ...s, probe: snapToField(p, fieldOf(s)) })),
      updateTempo: (i: number, t: Partial<TempoSection>) =>
        setState((s) => ({
          ...s,
          tempos: s.tempos.map((x, j) =>
            j === i
              ? {
                  label: t.label ?? x.label,
                  bpm: clamp(Math.round(t.bpm ?? x.bpm), TEMPO_LIMITS.min, TEMPO_LIMITS.max),
                }
              : x,
          ),
        })),
      addTempo: () =>
        setState((s) => {
          if (s.tempos.length >= MAX_TEMPOS) return s;
          const last = s.tempos[s.tempos.length - 1];
          return {
            ...s,
            tempos: [...s.tempos, { label: `Section ${s.tempos.length + 1}`, bpm: last.bpm }],
            activeTempo: s.tempos.length,
          };
        }),
      removeTempo: (i: number) =>
        setState((s) => {
          if (s.tempos.length <= 1) return s;
          const tempos = s.tempos.filter((_, j) => j !== i);
          return { ...s, tempos, activeTempo: clamp(s.activeTempo > i ? s.activeTempo - 1 : s.activeTempo, 0, tempos.length - 1) };
        }),
    }),
    [patch, state.timeSources.length],
  );

  return { state, field, selectedTs: Math.min(selectedTs, state.timeSources.length - 1), setSelectedTs, actions };
}

export type AppActions = ReturnType<typeof useAppState>['actions'];
