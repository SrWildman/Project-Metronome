import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { describePoint, FEET_PER_UNIT, type FieldSpec } from '../core/field';
import { toCounts, type Model, type Point } from '../core/model';
import {
  fromViewX,
  fromViewY,
  renderMap,
  toViewX,
  toViewY,
  viewSpan,
  type MapView as View,
} from '../core/render';
import { clamp, viewMargin, type AppState } from '../core/state';

const MAP_PIXELS = 800;

type DragTarget = { kind: 'ts'; index: number } | { kind: 'fp' } | { kind: 'probe' };

interface Props {
  state: AppState;
  field: FieldSpec;
  model: Model;
  selectedTs: number;
  onSelectTs: (i: number) => void;
  onMoveTs: (i: number, p: Point) => void;
  onMoveFocal: (p: Point) => void;
  onMoveProbe: (p: Point) => void;
  onRemoveTs: (i: number) => void;
}

const baseUrl = import.meta.env.BASE_URL;
const PHOTOS: Record<string, string> = {
  highschool: `${baseUrl}backgrounds/HighSchoolField.webp`,
  college: `${baseUrl}backgrounds/CollegeField.webp`,
};

function Backdrop({ field, view }: { field: FieldSpec; view: View }) {
  const fieldShare = `${(field.rows / viewSpan(view)) * 100}%`;
  const photo = PHOTOS[field.kind];
  const tenFeet = 10 / FEET_PER_UNIT;
  return (
    <>
      <div className="absolute inset-0 bg-slate-800" aria-hidden />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0"
        style={{
          height: fieldShare,
          backgroundImage: photo ? `url(${photo})` : undefined,
          backgroundColor: field.kind === 'gym' ? '#c8955a' : '#e2e8f0',
          backgroundSize: '100% 100%',
        }}
      >
        {!photo && (
          <svg viewBox={`0 0 ${field.width} ${field.rows}`} preserveAspectRatio="none" className="size-full">
            {field.kind === 'gym' ? (
              <g fill="none" stroke="#fff" strokeWidth="0.8">
                <rect x="1" y="1" width={field.width - 2} height={field.rows - 2} />
                <line x1={field.width / 2} y1="1" x2={field.width / 2} y2={field.rows - 1} />
                <circle cx={field.width / 2} cy={field.rows / 2} r={6 / FEET_PER_UNIT} />
              </g>
            ) : (
              <g stroke="#94a3b8" strokeWidth="0.4">
                {Array.from({ length: Math.floor(field.width / tenFeet) + 1 }, (_, i) => (
                  <line key={`v${i}`} x1={i * tenFeet} y1="0" x2={i * tenFeet} y2={field.rows} />
                ))}
                {Array.from({ length: Math.floor(field.rows / tenFeet) + 1 }, (_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * tenFeet} x2={field.width} y2={i * tenFeet} />
                ))}
              </g>
            )}
          </svg>
        )}
      </div>
    </>
  );
}

interface MarkerProps {
  left: number;
  top: number;
  label: string;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onFocus?: () => void;
  selected?: boolean;
  children: ReactNode;
  className: string;
  testId: string;
}

function Marker({ left, top, label, onKeyDown, onPointerDown, onFocus, selected, children, className, testId }: MarkerProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      aria-current={selected ? 'true' : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onFocus={onFocus}
      className="absolute z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center rounded-full active:cursor-grabbing"
      style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
    >
      <span
        aria-hidden
        className={`grid place-items-center text-xs font-bold shadow-md ring-2 ring-black/70 ${className} ${selected ? 'outline-3 outline-offset-2 outline-white' : ''}`}
      >
        {children}
      </span>
    </button>
  );
}

export function MapView({ state, field, model, selectedTs, onSelectTs, onMoveTs, onMoveFocal, onMoveProbe, onRemoveTs }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragTarget | null>(null);
  const [hover, setHover] = useState<{ p: Point; fx: number; fy: number; flip: boolean } | null>(null);

  const view = useMemo<View>(
    () => ({ width: field.width, rows: field.rows, margin: viewMargin(field) }),
    [field],
  );
  const span = viewSpan(view);

  // Paint a coarse map right away so dragging stays smooth, then sharpen once things settle.
  useEffect(() => {
    let sharpen = 0;
    const id = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      renderMap(canvas, model, view, MAP_PIXELS / 2, state.patterns);
      sharpen = window.setTimeout(() => renderMap(canvas, model, view, MAP_PIXELS, state.patterns), 140);
    });
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(sharpen);
    };
  }, [model, view, state.patterns]);

  const pointerToField = (e: { clientX: number; clientY: number }): Point => {
    const rect = boxRef.current!.getBoundingClientRect();
    return {
      x: fromViewX(view, (e.clientX - rect.left) / rect.width),
      y: fromViewY(view, (e.clientY - rect.top) / rect.height),
    };
  };

  const applyDrag = (target: DragTarget, p: Point) => {
    if (target.kind === 'ts') onMoveTs(target.index, p);
    else if (target.kind === 'probe') onMoveProbe(p);
    else {
      // A focal point that's off the map can only slide sideways until it's moved in with the numeric fields.
      const pinned = state.focalPoint.y < -view.margin;
      onMoveFocal(pinned ? { x: p.x, y: state.focalPoint.y } : p);
    }
  };

  const startDrag = (e: PointerEvent<HTMLElement>, target: DragTarget) => {
    e.stopPropagation();
    boxRef.current!.setPointerCapture(e.pointerId);
    drag.current = target;
    setHover(null);
    if (target.kind === 'ts') onSelectTs(target.index);
  };

  const onBackgroundDown = (e: PointerEvent<HTMLDivElement>) => {
    boxRef.current!.setPointerCapture(e.pointerId);
    drag.current = { kind: 'probe' };
    onMoveProbe(pointerToField(e));
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) {
      applyDrag(drag.current, pointerToField(e));
      return;
    }
    if (e.pointerType === 'mouse') {
      const rect = boxRef.current!.getBoundingClientRect();
      const fx = e.clientX - rect.left;
      setHover({ p: pointerToField(e), fx, fy: e.clientY - rect.top, flip: fx > rect.width * 0.6 });
    }
  };

  const endDrag = () => {
    drag.current = null;
  };

  const keyMove = (e: KeyboardEvent<HTMLElement>, current: Point, move: (p: Point) => void, onDelete?: () => void) => {
    const step = e.shiftKey ? 8 : 1;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (d[e.key]) {
      e.preventDefault();
      move({ x: current.x + d[e.key][0], y: current.y + d[e.key][1] });
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
      e.preventDefault();
      onDelete();
    }
  };

  const say = (p: Point) => {
    const d = describePoint(field, Math.round(p.x), Math.round(p.y));
    return `${d.horizontal}, ${d.vertical}`;
  };

  const fp = state.focalPoint;
  const fpPinned = fp.y < -view.margin;
  const fpTop = clamp(toViewY(view, fp.y), 0.04, 0.96);
  const fpLeft = clamp(toViewX(view, fp.x), 0.03, 0.97);
  const fpFeetOff = Math.round(-fp.y * FEET_PER_UNIT);

  const tip = hover && model.evaluate(hover.p.x, hover.p.y);
  const tipWords = hover && describePoint(field, Math.round(hover.p.x), Math.round(hover.p.y));

  return (
    <div
      id="map"
      ref={boxRef}
      role="group"
      aria-label="Field map. Drag the markers, or focus one and use the arrow keys. Click the map to place the player marker."
      onPointerDown={onBackgroundDown}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => setHover(null)}
      className="relative w-full touch-pan-y overflow-hidden rounded-xl bg-slate-800 select-none"
      style={{ aspectRatio: `${view.width} / ${span}` }}
      data-testid="map"
    >
      <Backdrop field={field} view={view} />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden data-testid="map-canvas" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-start pb-0.5 pl-2 text-[10px] font-medium tracking-wide text-white/80 uppercase"
        style={{ height: `${(view.margin / span) * 100}%` }}
      >
        ▼ off the field
      </div>

      {state.timeSources.map((ts, i) => (
        <Marker
          key={i}
          testId={`ts-${i}`}
          left={toViewX(view, ts.x)}
          top={toViewY(view, ts.y)}
          selected={i === selectedTs}
          label={`Time source ${i + 1}: ${say(ts)}. Arrow keys move it${state.timeSources.length > 1 ? ', Delete removes it' : ''}.`}
          onFocus={() => onSelectTs(i)}
          onPointerDown={(e) => startDrag(e, { kind: 'ts', index: i })}
          onKeyDown={(e) => keyMove(e, ts, (p) => onMoveTs(i, p), state.timeSources.length > 1 ? () => onRemoveTs(i) : undefined)}
          className="size-7 rounded-full bg-yellow-300 text-black"
        >
          {i + 1}
        </Marker>
      ))}

      <Marker
        testId="fp"
        left={fpLeft}
        top={fpTop}
        label={`Focal point: ${fpPinned ? `${fpFeetOff} feet off the front sideline` : say(fp)}. Arrow keys move it.`}
        onPointerDown={(e) => startDrag(e, { kind: 'fp' })}
        onKeyDown={(e) => keyMove(e, fp, onMoveFocal)}
        className="size-7 rotate-45 rounded-sm bg-white text-black"
      >
        <span className="-rotate-45">F</span>
      </Marker>
      {fpPinned && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white"
          style={{ left: `${fpLeft * 100}%`, top: `${fpTop * 100 - 4}%`, transform: 'translate(-50%, -100%)' }}
        >
          {fpFeetOff} ft off the field ↓
        </span>
      )}

      <Marker
        testId="probe"
        left={toViewX(view, state.probe.x)}
        top={toViewY(view, state.probe.y)}
        label={`Player marker: ${say(state.probe)}. Arrow keys move it.`}
        onPointerDown={(e) => startDrag(e, { kind: 'probe' })}
        onKeyDown={(e) => keyMove(e, state.probe, onMoveProbe)}
        className="size-7 rounded-full bg-slate-900 text-white"
      >
        P
      </Marker>

      {hover && tip && tipWords && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-20 rounded-md border border-white/30 bg-black/85 px-2 py-1 text-xs whitespace-nowrap text-white"
          style={{
            left: hover.fx,
            top: hover.fy,
            transform: `translate(${hover.flip ? 'calc(-100% - 12px)' : '12px'}, 12px)`,
          }}
        >
          <div>{tipWords.horizontal}</div>
          <div className="font-semibold">{tipWords.vertical}</div>
          <div>
            Delay: {(tip.delay * 1000).toFixed(0)} ms ({toCounts(tip.delay, model.scenario.tempo).toFixed(2)} counts)
          </div>
        </div>
      )}
    </div>
  );
}
