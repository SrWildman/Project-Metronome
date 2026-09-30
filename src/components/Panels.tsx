import { useState } from 'react';
import {
  CUSTOM_LIMITS,
  fromXY,
  toXY,
  FEET_PER_UNIT,
  type FieldKind,
  type FieldSpec,
  type FootballField,
  type Location,
  type Marker,
} from '../core/field';
import type { FieldStats, Point } from '../core/model';
import { cardinal, errorSeconds, speedOfSound } from '../core/physics';
import {
  FOCAL_PRESETS,
  MAX_TEMPOS,
  MAX_TIME_SOURCES,
  NOTE_DIVISORS,
  TEMP_LIMITS,
  TEMPO_LIMITS,
  WIND_LIMITS,
  type AppState,
} from '../core/state';
import type { AppActions } from '../hooks/useAppState';
import { buttonClass, Hint, inputClass, NumberField, RadioGroup, SelectField, Section, Slider } from './ui';

interface PanelProps {
  state: AppState;
  field: FieldSpec;
  actions: AppActions;
}

const FIELD_OPTIONS: { value: FieldKind; label: string }[] = [
  { value: 'highschool', label: 'High school football' },
  { value: 'college', label: 'College football' },
  { value: 'gym', label: 'Gym / basketball court (94 × 50 ft)' },
  { value: 'custom', label: 'Custom size' },
];

export function FieldPanel({ state, actions }: PanelProps) {
  return (
    <Section title="Field">
      <RadioGroup legend="Field type" value={state.fieldKind} options={FIELD_OPTIONS} onChange={actions.setFieldKind} />
      {state.fieldKind === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Length"
            suffix="ft"
            min={CUSTOM_LIMITS.min}
            max={CUSTOM_LIMITS.max}
            value={state.customLengthFt}
            onChange={(v) => actions.setCustomSize(v, state.customWidthFt)}
          />
          <NumberField
            label="Width"
            suffix="ft"
            min={CUSTOM_LIMITS.min}
            max={CUSTOM_LIMITS.max}
            value={state.customWidthFt}
            onChange={(v) => actions.setCustomSize(state.customLengthFt, v)}
          />
        </div>
      )}
      <Hint>
        Positions use half-steps (11.25 in). Changing the field resets the marker positions.
      </Hint>
    </Section>
  );
}

const MARKERS = [
  { value: 0, label: 'Front sideline' },
  { value: 1, label: 'Front hash' },
  { value: 2, label: 'Back hash' },
  { value: 3, label: 'Back sideline' },
] as const;

const YARDLINES = Array.from({ length: 11 }, (_, i) => ({ value: i * 5, label: i === 0 ? 'Goal line (0)' : String(i * 5) }));

/** Lets people enter a position the way they say it: "3 steps inside the S1 40, 2 steps behind the front hash". */
function JargonForm({ point, kind, onChange }: { point: Point; kind: FootballField; onChange: (p: Point) => void }) {
  const loc = fromXY(point.x, point.y, kind);
  const edit = (patch: Partial<Location>) => onChange(toXY({ ...loc, ...patch }, kind));
  const maxY = kind === 'college' ? 32 : 28;
  return (
    <div className="space-y-3" data-testid="jargon-form">
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Yard line" value={loc.yardline} options={YARDLINES} onChange={(yardline) => edit({ yardline })} />
        <SelectField
          label="Side"
          value={loc.side ? 1 : 2}
          options={[{ value: 1, label: 'Side 1' }, { value: 2, label: 'Side 2' }]}
          onChange={(v) => edit({ side: v === 1 })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Steps from yard line" min={0} max={16} step={0.5} value={loc.xSteps} onChange={(xSteps) => edit({ xSteps })} />
        <SelectField
          label="Direction"
          value={loc.inside ? 'inside' : 'outside'}
          options={[{ value: 'inside', label: 'Inside' }, { value: 'outside', label: 'Outside' }]}
          onChange={(v) => edit({ inside: v === 'inside' })}
        />
      </div>
      <SelectField label="Marker" value={loc.marker} options={MARKERS} onChange={(marker) => edit({ marker: marker as Marker })} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Steps from marker" min={0} max={maxY} step={0.5} value={loc.ySteps} onChange={(ySteps) => edit({ ySteps })} />
        <SelectField
          label="Direction"
          value={loc.front ? 'front' : 'behind'}
          options={[{ value: 'front', label: 'In front of' }, { value: 'behind', label: 'Behind' }]}
          onChange={(v) => edit({ front: v === 'front' })}
        />
      </div>
    </div>
  );
}

export function TimeSourcePanel({
  state,
  field,
  actions,
  selected,
  onSelect,
}: PanelProps & { selected: number; onSelect: (i: number) => void }) {
  const point = state.timeSources[selected];
  const feet = (u: number) => Math.round(u * FEET_PER_UNIT * 10) / 10;
  return (
    <Section title="Time sources">
      <Hint>
        Metronome, drumline, or anything else that sets tempo. Drag the yellow markers on the map, or use
        the fields below. With more than one, players follow whichever is best for them.
      </Hint>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a time source">
        {state.timeSources.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === selected}
            onClick={() => onSelect(i)}
            className={`${buttonClass} ${i === selected ? 'border-accent! ring-2 ring-accent' : ''}`}
          >
            Source {i + 1}
          </button>
        ))}
        <button
          type="button"
          className={buttonClass}
          onClick={actions.addTimeSource}
          disabled={state.timeSources.length >= MAX_TIME_SOURCES}
          data-testid="add-ts"
        >
          + Add
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => actions.removeTimeSource(selected)}
          disabled={state.timeSources.length <= 1}
        >
          Remove source {selected + 1}
        </button>
      </div>
      {field.football && (field.kind === 'highschool' || field.kind === 'college') ? (
        <JargonForm point={point} kind={field.kind} onChange={(p) => actions.moveTimeSource(selected, p)} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="From left end"
            suffix="ft"
            min={0}
            max={feet(field.width)}
            step={0.5}
            value={feet(point.x)}
            onChange={(v) => actions.moveTimeSource(selected, { ...point, x: v / FEET_PER_UNIT })}
          />
          <NumberField
            label="From front edge"
            suffix="ft"
            min={0}
            max={feet(field.rows)}
            step={0.5}
            value={feet(point.y)}
            onChange={(v) => actions.moveTimeSource(selected, { ...point, y: v / FEET_PER_UNIT })}
          />
        </div>
      )}
    </Section>
  );
}

export function FocalPanel({ state, field, actions }: PanelProps) {
  const fp = state.focalPoint;
  const presetKey = (Object.keys(FOCAL_PRESETS) as (keyof typeof FOCAL_PRESETS)[]).find(
    (k) => FOCAL_PRESETS[k].x === fp.x && FOCAL_PRESETS[k].y === fp.y,
  );
  const options = [
    ...(field.football ? Object.entries(FOCAL_PRESETS).map(([value, p]) => ({ value, label: p.label })) : []),
    { value: 'custom', label: 'Custom position' },
  ];
  const ft = (u: number) => Math.round(u * FEET_PER_UNIT * 10) / 10;
  return (
    <Section title="Focal point">
      <Hint>
        The point the ensemble's sound needs to line up at: the audience, press box, or drum major. Drag
        the white diamond on the map, or pick a preset.
      </Hint>
      <SelectField
        label="Focal point"
        value={presetKey ?? 'custom'}
        options={options}
        onChange={(v) => {
          if (v !== 'custom') actions.moveFocal(FOCAL_PRESETS[v as keyof typeof FOCAL_PRESETS]);
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="From left end"
          suffix="ft"
          min={-500}
          max={1000}
          step={1}
          value={ft(fp.x)}
          onChange={(v) => actions.moveFocal({ ...fp, x: v / FEET_PER_UNIT })}
        />
        <NumberField
          label="Off front edge"
          suffix="ft"
          min={-1000}
          max={500}
          step={1}
          value={ft(-fp.y)}
          onChange={(v) => actions.moveFocal({ ...fp, y: -v / FEET_PER_UNIT })}
        />
      </div>
    </Section>
  );
}

export function TimingPanel({
  state,
  actions,
  stats,
}: Pick<PanelProps, 'state' | 'actions'> & { stats: FieldStats | null }) {
  return (
    <Section title="Tempo and acceptable error">
      <SelectField
        label="Acceptable error"
        value={state.noteDivisor}
        options={NOTE_DIVISORS.map((d) => ({ value: d, label: `1/${d} note` }))}
        onChange={(noteDivisor) => actions.patch({ noteDivisor })}
      />
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Tempo sections</legend>
        <Hint>Add a section for each tempo in the show, then pick which one the map shows.</Hint>
        <ul className="mt-2 space-y-2">
          {state.tempos.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="active-tempo"
                aria-label={`Show ${t.label} on the map`}
                checked={i === state.activeTempo}
                onChange={() => actions.patch({ activeTempo: i })}
                className="size-4 shrink-0 accent-accent"
              />
              <input
                aria-label={`Section ${i + 1} name`}
                value={t.label}
                maxLength={40}
                onChange={(e) => actions.updateTempo(i, { label: e.target.value })}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <input
                aria-label={`${t.label} tempo in beats per minute`}
                type="number"
                inputMode="numeric"
                min={TEMPO_LIMITS.min}
                max={TEMPO_LIMITS.max}
                value={t.bpm}
                onChange={(e) => {
                  const v = e.target.valueAsNumber;
                  if (Number.isFinite(v)) actions.updateTempo(i, { bpm: v });
                }}
                className={`${inputClass} w-20`}
                data-testid={`bpm-${i}`}
              />
              <button
                type="button"
                className={buttonClass}
                aria-label={`Remove ${t.label}`}
                disabled={state.tempos.length <= 1}
                onClick={() => actions.removeTempo(i)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${buttonClass} mt-2`}
          onClick={actions.addTempo}
          disabled={state.tempos.length >= MAX_TEMPOS}
        >
          + Add tempo section
        </button>
      </fieldset>
      {state.tempos.length > 1 && stats && (
        <table className="w-full text-left text-sm" data-testid="tempo-table">
          <caption className="mb-1 text-left font-medium">Compare sections</caption>
          <thead className="text-slate-600 dark:text-slate-400">
            <tr>
              <th className="py-1 font-medium">Section</th>
              <th className="py-1 text-right font-medium">Error</th>
              <th className="py-1 text-right font-medium">Green zone</th>
            </tr>
          </thead>
          <tbody>
            {state.tempos.map((t, i) => {
              const err = errorSeconds(t.bpm, state.noteDivisor);
              return (
                <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-1">{t.label} <span className="text-slate-500">({t.bpm})</span></td>
                  <td className="py-1 text-right tabular-nums">{Math.round(err * 1000)} ms</td>
                  <td className="py-1 text-right tabular-nums">{Math.round(stats.greenFraction(err) * 100)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Section>
  );
}

const toC = (f: number) => Math.round(((f - 32) * 5) / 9);

export function WeatherPanel({ state, actions }: Pick<PanelProps, 'state' | 'actions'>) {
  const [status, setStatus] = useState<string | null>(null);

  const useLocation = () => {
    if (!navigator.geolocation) return setStatus('Location is not available in this browser.');
    setStatus('Looking up the temperature…');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude.toFixed(2)}&longitude=${coords.longitude.toFixed(2)}&current=temperature_2m&temperature_unit=fahrenheit`;
          const res = await fetch(url);
          const data = (await res.json()) as { current?: { temperature_2m?: number } };
          const t = data.current?.temperature_2m;
          if (typeof t !== 'number') throw new Error('no temperature');
          actions.patch({ tempF: Math.round(Math.min(TEMP_LIMITS.max, Math.max(TEMP_LIMITS.min, t))) });
          setStatus(`Set to the current temperature: ${Math.round(t)}°F.`);
        } catch {
          setStatus("Couldn't get the weather. Are you online? You can enter the temperature by hand.");
        }
      },
      () => setStatus('Location permission was denied. You can enter the temperature by hand.'),
      { timeout: 10000 },
    );
  };

  return (
    <Section title="Weather">
      <Hint>
        Sound moves faster in warm air, and wind carries it. Both change the delays a little, and they matter
        most at large distances.
      </Hint>
      <Slider
        label="Temperature"
        valueText={`${state.tempF}°F (${toC(state.tempF)}°C) · sound ${speedOfSound(state.tempF).toFixed(0)} ft/s`}
        min={TEMP_LIMITS.min}
        max={TEMP_LIMITS.max}
        step={1}
        value={state.tempF}
        onChange={(tempF) => actions.patch({ tempF })}
      />
      <button type="button" className={buttonClass} onClick={useLocation}>
        Use the current temperature where I am
      </button>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        This sends your approximate location to open-meteo.com to look up the temperature.
      </p>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
      <Slider
        label="Wind speed"
        valueText={`${state.windMph} mph`}
        min={WIND_LIMITS.min}
        max={WIND_LIMITS.max}
        step={1}
        value={state.windMph}
        onChange={(windMph) => actions.patch({ windMph })}
      />
      {state.windMph > 0 && (
        <Slider
          label="Wind blowing toward"
          valueText={`${cardinal(state.windToDeg)} (${state.windToDeg}°)`}
          min={0}
          max={359}
          step={5}
          value={state.windToDeg}
          onChange={(windToDeg) => actions.patch({ windToDeg })}
        />
      )}
    </Section>
  );
}

export function DisplayPanel({ state, actions }: Pick<PanelProps, 'state' | 'actions'>) {
  return (
    <Section title="Display" defaultOpen={false}>
      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.patterns}
          onChange={(e) => actions.patch({ patterns: e.target.checked })}
          className="size-4 accent-accent"
        />
        Add patterns to the zones (dots in the green zone, stripes in orange rings) so they don't rely on color
      </label>
    </Section>
  );
}

