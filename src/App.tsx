import { useDeferredValue, useMemo, useState } from 'react';
import { ExplainPanel } from './components/ExplainPanel';
import { MapView } from './components/MapView';
import { DisplayPanel, FieldPanel, FocalPanel, TimeSourcePanel, TimingPanel, WeatherPanel } from './components/Panels';
import { Readout } from './components/Readout';
import { headerButtonClass, Section } from './components/ui';
import { createModel, fieldStats, toCounts, Zone } from './core/model';
import { ZONE_HEX } from './core/render';
import { toScenario } from './core/state';
import { useAppState } from './hooks/useAppState';

function Swatch({ color, pattern }: { color: string; pattern?: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-4 rounded-sm align-[-0.2em] ring-1 ring-black/40"
      style={{ background: color, backgroundImage: pattern }}
    />
  );
}

export function App() {
  const { state, field, selectedTs, setSelectedTs, actions } = useAppState();
  const [copied, setCopied] = useState<string | null>(null);

  const scenario = useMemo(() => toScenario(state), [state]);
  const model = useMemo(() => createModel(scenario), [scenario]);

  // The full-field scan is the only expensive step, and it doesn't depend on tempo,
  // so run it at low priority and only when the geometry or weather changes.
  const { timeSources, focalPoint, tempF, windMph, windToDeg } = state;
  const geometry = useDeferredValue(
    useMemo(
      () => ({ field, timeSources, focalPoint, tempF, windMph, windToDeg }),
      [field, timeSources, focalPoint, tempF, windMph, windToDeg],
    ),
  );
  const stats = useMemo(
    () => fieldStats(createModel({ ...geometry, tempo: 120, noteDivisor: 4 })),
    [geometry],
  );
  const green = stats.greenFraction(model.error);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Project Metronome', url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied('Link copied to the clipboard.');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied('Link copied to the clipboard.');
      } catch {
        setCopied('Copy the address from your browser to share this setup.');
      }
    }
    window.setTimeout(() => setCopied(null), 4000);
  };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <a
        href="#map"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2 focus:text-black"
      >
        Skip to the map
      </a>
      <header className="shrink-0 border-b border-slate-200 bg-slate-900 text-white dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-widest uppercase">Project Metronome</h1>
            <p className="text-sm text-slate-300">Where should the band listen, and where should it watch?</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={headerButtonClass} onClick={share} data-testid="share">
              Copy link
            </button>
            <button type="button" className={headerButtonClass} onClick={actions.reset}>
              Reset
            </button>
          </div>
        </div>
      </header>
      <p role="status" className="sr-only">
        {copied}
      </p>
      {copied && (
        <p aria-hidden className="bg-emerald-700 px-4 py-1 text-center text-sm text-white">
          {copied}
        </p>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:overflow-hidden">
        {/* Right column on desktop. On phones the wrappers disappear so the map can stay pinned to the top. */}
        <div data-testid="main-column" className="contents lg:col-start-2 lg:row-start-1 lg:block lg:min-h-0 lg:space-y-4 lg:overflow-y-auto lg:pr-1">
          <div className="contents lg:block lg:space-y-4">
            <div className="sticky top-0 z-20 order-1 -mx-4 bg-slate-50/95 px-4 pt-2 pb-2 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:bg-slate-950/95">
              <MapView
                state={state}
                field={field}
                model={model}
                selectedTs={selectedTs}
                onSelectTs={setSelectedTs}
                onMoveTs={actions.moveTimeSource}
                onMoveFocal={actions.moveFocal}
                onMoveProbe={actions.moveProbe}
                onRemoveTs={actions.removeTimeSource}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" data-testid="legend">
                <span>
                  <Swatch color={ZONE_HEX[Zone.Green]} /> Green: play with the time source
                </span>
                <span>
                  <Swatch color={ZONE_HEX[Zone.RingOdd]} /> <Swatch color={ZONE_HEX[Zone.RingEven]} /> Rings: one note
                  (1/{state.noteDivisor}) each
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  <b>1</b> time source · <b>F</b> focal point · <b>P</b> player
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400" data-testid="stats">
                Green zone covers {Math.round(green * 100)}% of the field. Longest delay:{' '}
                {(stats.maxDelay * 1000).toFixed(0)} ms ({toCounts(stats.maxDelay, model.scenario.tempo).toFixed(2)}{' '}
                counts).
              </p>
            </div>
            <div className="order-2">
              <Readout state={state} field={field} model={model} />
            </div>
          </div>

          <div className="order-4 space-y-4">
            <ExplainPanel state={state} model={model} />
            <Section title="How to read the map" defaultOpen={false}>
              <div className="space-y-2 text-sm">
                <p>
                  Anyone in the green zone may play with what they hear from the time source. If the conductor and
                  time source are visually together, anyone in the same ring as the time source may play with what
                  they see from the conductor.
                </p>
                <p>
                  For each ring outside the time source's ring, a player must be one note (of the acceptable error
                  you chose) ahead of what they see from the conductor. For each ring inside, one note behind.
                </p>
                <p>
                  Click or drag on the map to move the P marker and see the numbers for that spot. Drag the yellow
                  markers (time sources) and the diamond (focal point) to try different setups. With a keyboard, Tab
                  to a marker and use the arrow keys (Shift for bigger steps).
                </p>
              </div>
            </Section>
            <Section title="Tutorial video" defaultOpen={false}>
              <iframe
                title="Project Metronome tutorial"
                src="https://www.youtube-nocookie.com/embed/fDRXNcMAeqg"
                loading="lazy"
                allowFullScreen
                className="aspect-video w-full rounded-lg border-0"
              />
            </Section>
          </div>
        </div>

        <div data-testid="sidebar" className="order-3 space-y-4 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <FieldPanel state={state} field={field} actions={actions} />
          <TimeSourcePanel state={state} field={field} actions={actions} selected={selectedTs} onSelect={setSelectedTs} />
          <FocalPanel state={state} field={field} actions={actions} />
          <TimingPanel state={state} actions={actions} stats={stats} />
          <WeatherPanel state={state} actions={actions} />
          <DisplayPanel state={state} actions={actions} />
        </div>
      </main>
    </div>
  );
}
