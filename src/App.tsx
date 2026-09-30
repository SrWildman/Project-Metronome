import { useMemo, useState } from 'react';
import { FieldMap } from './components/FieldMap';
import { RadioGroup, Slider } from './components/inputs';
import {
  calculateField,
  errorSeconds,
  FOCAL_POINTS,
  timeSourceToPoint,
  type FocalPointId,
  type TimeSourceInput,
} from './core/delay';
import type { FieldType, Marker } from './core/field';

const MAX_VERTICAL_STEPS: Record<FieldType, number> = { college: 32, highschool: 28 };

const ERROR_NOTES = Array.from({ length: 7 }, (_, i) => {
  const value = 2 ** (i + 2);
  return { value, label: `1/${value} note` };
});

const FIELD_OPTIONS = [
  { value: 'highschool', label: 'High School' },
  { value: 'college', label: 'College' },
] as const;

const MARKER_OPTIONS = [
  { value: 0, label: 'Front Sideline' },
  { value: 1, label: 'Front Hash' },
  { value: 2, label: 'Back Hash' },
  { value: 3, label: 'Back Sideline' },
] as const;

const FOCAL_OPTIONS = (Object.keys(FOCAL_POINTS) as FocalPointId[]).map((id) => ({
  value: id,
  label: FOCAL_POINTS[id].label,
}));

export function App() {
  const [field, setField] = useState<FieldType>('highschool');
  const [focalPoint, setFocalPoint] = useState<FocalPointId>('hspb');
  const [tempo, setTempo] = useState(160);
  const [noteDivisor, setNoteDivisor] = useState(64);
  const [ts, setTs] = useState<TimeSourceInput>({
    yardLine: 50,
    fieldSide: 1,
    marker: 1,
    vertical: { whole: 0, partial: 0, front: true },
    horizontal: { whole: 0, partial: 0, inside: true },
  });

  const timeSource = useMemo(() => timeSourceToPoint(ts, field), [ts, field]);
  const result = useMemo(
    () => calculateField(timeSource, FOCAL_POINTS[focalPoint], errorSeconds(tempo, noteDivisor), field),
    [timeSource, focalPoint, tempo, noteDivisor, field],
  );

  const setVertical = (patch: Partial<TimeSourceInput['vertical']>) =>
    setTs((t) => ({ ...t, vertical: { ...t.vertical, ...patch } }));
  const setHorizontal = (patch: Partial<TimeSourceInput['horizontal']>) =>
    setTs((t) => ({ ...t, horizontal: { ...t.horizontal, ...patch } }));

  const changeField = (next: FieldType) => {
    setField(next);
    setVertical({ whole: Math.min(ts.vertical.whole, MAX_VERTICAL_STEPS[next]) });
  };

  return (
    <>
      <header className="hero">
        <h1>Project Metronome</h1>
        <p>
          Project Metronome helps directors and instructors of marching arts programs understand when
          it is appropriate for students to listen to the metronome/drumline, and when the sound
          delay is too great and will affect ensemble timing.
        </p>
      </header>

      <main className="layout">
        <section className="controls" aria-label="Settings">
          <h2>Field</h2>
          <RadioGroup legend="Field type" name="field" value={field} options={FIELD_OPTIONS} onChange={changeField} />
          <RadioGroup legend="Focal point" name="focal" value={focalPoint} options={FOCAL_OPTIONS} onChange={setFocalPoint} />

          <h2>Time source</h2>
          <p className="hint">
            The location of the metronome, drumline, or anything else controlling tempo. Steps are a
            standard 22.5 inches.
          </p>
          <Slider label={`${ts.yardLine} yard line`} value={ts.yardLine} min={0} max={50} step={5}
            onChange={(yardLine) => setTs({ ...ts, yardLine })} />
          <RadioGroup legend="Side" name="side" value={ts.fieldSide}
            options={[{ value: 1, label: 'Side 1' }, { value: 2, label: 'Side 2' }]}
            onChange={(fieldSide) => setTs({ ...ts, fieldSide: fieldSide as 1 | 2 })} />
          <Slider label={`Horizontal whole steps: ${ts.horizontal.whole}`} value={ts.horizontal.whole} min={0} max={4} step={1}
            onChange={(whole) => setHorizontal({ whole })} />
          <Slider label={`Horizontal partial step: ${ts.horizontal.partial}`} value={ts.horizontal.partial} min={0} max={0.5} step={0.5}
            onChange={(partial) => setHorizontal({ partial })} />
          <RadioGroup legend="Horizontal direction" name="hdir" value={ts.horizontal.inside ? 'inside' : 'outside'}
            options={[{ value: 'inside', label: 'Inside' }, { value: 'outside', label: 'Outside' }]}
            onChange={(v) => setHorizontal({ inside: v === 'inside' })} />
          <RadioGroup legend="Marker" name="marker" value={ts.marker} options={MARKER_OPTIONS}
            onChange={(marker) => setTs({ ...ts, marker: marker as Marker })} />
          <Slider label={`Vertical whole steps: ${ts.vertical.whole}`} value={ts.vertical.whole} min={0} max={MAX_VERTICAL_STEPS[field]} step={1}
            onChange={(whole) => setVertical({ whole })} />
          <Slider label={`Vertical partial step: ${ts.vertical.partial}`} value={ts.vertical.partial} min={0} max={0.5} step={0.5}
            onChange={(partial) => setVertical({ partial })} />
          <RadioGroup legend="Vertical direction" name="vdir" value={ts.vertical.front ? 'front' : 'back'}
            options={[{ value: 'front', label: 'In front of' }, { value: 'back', label: 'Behind' }]}
            onChange={(v) => setVertical({ front: v === 'front' })} />

          <h2>Timing</h2>
          <Slider label={`Tempo: ${tempo}`} value={tempo} min={30} max={300} step={1} onChange={setTempo} />
          <label className="select">
            <span>Acceptable error</span>
            <select value={noteDivisor} onChange={(e) => setNoteDivisor(Number(e.target.value))}>
              {ERROR_NOTES.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="results" aria-label="Results">
          <FieldMap result={result} timeSource={timeSource} />
          <div className="legend">
            <span><i className="swatch green" /> Play with the time source</span>
            <span><i className="swatch yellow" /> Time source</span>
          </div>
          <details open>
            <summary>How to read the map</summary>
            <p>
              The map is a grid marked in half-step increments. Hover over it for details about a
              location. Anyone in the green zone may play with what they hear from the time source.
            </p>
            <p>
              If the conductor and time source (yellow dot) are visually together, anyone within the
              same ring as the time source may play with what they see from the conductor. For each ring
              outside the time source, a player must be one note (of the selected error value) ahead of
              what they see from the conductor. For each ring inside, a player must be one note behind.
            </p>
          </details>
          <details>
            <summary>Tutorial video</summary>
            <iframe
              title="Project Metronome tutorial"
              src="https://www.youtube-nocookie.com/embed/fDRXNcMAeqg"
              loading="lazy"
              allowFullScreen
            />
          </details>
        </section>
      </main>

      <footer>
        Created by Brian Boudreaux, Zack Shackleton, Chris Sipes, and Sam Wildman ·
        contact@projectmetronome.com
      </footer>
    </>
  );
}
