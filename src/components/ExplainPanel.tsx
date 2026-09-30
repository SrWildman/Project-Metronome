import { explainAt, formatMs, type Model } from '../core/model';
import type { AppState } from '../core/state';
import { cardinal } from '../core/physics';
import { Section } from './ui';

export function ExplainPanel({ state, model }: { state: AppState; model: Model }) {
  const e = explainAt(model, state.probe.x, state.probe.y);
  const { windMph, windToDeg } = model.scenario;
  return (
    <Section title="How is this calculated?" defaultOpen={false}>
      <div className="space-y-3 text-sm">
        <p>
          A player listens to the time source and plays when they hear it. Their sound then travels on to
          the focal point. The <strong>delay</strong> is how much later that sound arrives than the time
          source's own sound does:
        </p>
        <p className="rounded-md bg-slate-100 p-3 font-mono text-xs dark:bg-slate-800">
          delay = (time source → player) + (player → focal point) − (time source → focal point)
        </p>
        <p>
          Sound travels at <strong>{e.soundSpeed.toFixed(0)} ft/s</strong> at {state.tempF}°F
          {windMph > 0 && (
            <>
              , adjusted for a {windMph} mph wind blowing toward the {cardinal(windToDeg)} along each path
            </>
          )}
          . If the delay is no more than one note of the acceptable error, the player can play with what they
          hear. Otherwise they need to play with the conductor, adjusted by one note for each ring.
        </p>
        <table className="w-full text-left">
          <caption className="mb-1 text-left font-medium">
            For the player marker (time source {e.source + 1})
          </caption>
          <thead className="text-slate-600 dark:text-slate-400">
            <tr>
              <th className="py-1 font-medium">Path</th>
              <th className="py-1 text-right font-medium">Distance</th>
              <th className="py-1 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {e.legs.map((leg) => (
              <tr key={leg.label} className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-1">{leg.label}</td>
                <td className="py-1 text-right tabular-nums">{leg.feet.toFixed(1)} ft</td>
                <td className="py-1 text-right tabular-nums">{(leg.seconds * 1000).toFixed(1)} ms</td>
              </tr>
            ))}
            <tr className="border-t border-slate-300 font-semibold dark:border-slate-700">
              <td className="py-1">Delay</td>
              <td />
              <td className="py-1 text-right tabular-nums">{(e.delay * 1000).toFixed(1)} ms</td>
            </tr>
            <tr>
              <td className="py-1">Allowed error (one {`1/${state.noteDivisor}`} note at {model.scenario.tempo} bpm)</td>
              <td />
              <td className="py-1 text-right tabular-nums">{formatMs(e.error)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-slate-600 dark:text-slate-400">
          With several time sources, each player follows whichever gives them the smallest delay. Rings
          are drawn around the focal point, each one note of error wide. This model assumes still,
          dry air apart from the temperature and wind you enter.
        </p>
      </div>
    </Section>
  );
}
