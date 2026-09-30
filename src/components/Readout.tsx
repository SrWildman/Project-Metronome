import { useEffect, useRef, useState } from 'react';
import { DelayDemo } from '../core/audio';
import { describePoint, type FieldSpec } from '../core/field';
import {
  explainAt,
  formatMs,
  guidanceAt,
  toCounts,
  Zone,
  type Guidance,
  type Model,
} from '../core/model';
import type { AppState } from '../core/state';
import { buttonClass } from './ui';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const notes = (n: number, divisor: number) => `${plural(n, 'note')} (1/${divisor})`;

export function guidanceText(g: Guidance, divisor: number): string {
  switch (g.kind) {
    case 'time-source':
      return 'Green zone: play with what you hear from the time source.';
    case 'conductor':
      return 'Same ring as the time source: play with what you see from the conductor.';
    case 'ahead':
      return `${plural(g.notes, 'ring')} outside the time source: play ${notes(g.notes, divisor)} ahead of what you see from the conductor.`;
    case 'behind':
      return `${plural(g.notes, 'ring')} inside the time source: play ${notes(g.notes, divisor)} behind what you see from the conductor.`;
  }
}

export function Readout({ state, field, model }: { state: AppState; field: FieldSpec; model: Model }) {
  const { probe } = state;
  const ev = model.evaluate(probe.x, probe.y);
  const tempo = model.scenario.tempo;
  const guidance = guidanceAt(model, probe.x, probe.y);
  const zone = model.zoneOf(ev);
  const where = describePoint(field, probe.x, probe.y);
  const ring = explainAt(model, probe.x, probe.y).ring;

  const demo = useRef<DelayDemo | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    demo.current?.update(tempo, ev.delay);
  }, [tempo, ev.delay]);
  useEffect(() => () => demo.current?.dispose(), []);

  const toggle = async () => {
    demo.current ??= new DelayDemo();
    if (demo.current.playing) {
      demo.current.stop();
      setPlaying(false);
      return;
    }
    try {
      await demo.current.start(tempo, ev.delay);
      setPlaying(true);
    } catch {
      setAudioError(true);
    }
  };

  const zoneLabel = zone === Zone.Green ? 'Green zone' : `Ring ${ring} (${zone === Zone.RingOdd ? 'orange' : 'blue'})`;

  return (
    <section
      aria-label="Player marker readout"
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="text-base font-semibold">Player marker (P)</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400" data-testid="probe-position">
        {where.horizontal}; {where.vertical}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-600 dark:text-slate-400">Sound delay</dt>
          <dd className="text-lg font-semibold tabular-nums" data-testid="probe-delay">
            {formatMs(ev.delay)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">In counts</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {toCounts(ev.delay, tempo).toFixed(2)} at {tempo} bpm
          </dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">Allowed error</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatMs(model.error)}</dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">Zone</dt>
          <dd className="text-lg font-semibold">{zoneLabel}</dd>
        </div>
      </dl>
      {state.timeSources.length > 1 && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Following time source {ev.source + 1} (the best of {state.timeSources.length}).
        </p>
      )}
      <p role="status" className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-medium dark:bg-slate-800" data-testid="guidance">
        {guidanceText(guidance, state.noteDivisor)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} onClick={toggle} aria-pressed={playing} data-testid="play">
          {playing ? '■ Stop' : '▶ Hear the delay'}
        </button>
        <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-400">
          Plays the time source's click (high) and a player at P who plays with what they hear (low), as
          they sound at the focal point. The gap between them is the delay.
        </p>
      </div>
      {audioError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">Audio isn't available in this browser.</p>}
    </section>
  );
}
