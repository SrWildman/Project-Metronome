import { useId, type ReactNode } from 'react';

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800';

export const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700';

export const headerButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-200';

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold">
        {title}
        <span aria-hidden className="text-slate-400 transition group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-600 dark:text-slate-400">{children}</p>;
}

interface Option<T extends string | number> {
  value: T;
  label: string;
}

export function RadioGroup<T extends string | number>({
  legend,
  value,
  options,
  onChange,
  columns = 1,
}: {
  legend: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  columns?: 1 | 2;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className={columns === 2 ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-1'}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-slate-100 has-checked:bg-slate-100 dark:hover:bg-slate-800 dark:has-checked:bg-slate-800"
          >
            <input
              type="radio"
              name={name}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="size-4 accent-accent"
            />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Slider({
  label,
  valueText,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  valueText?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <span className="tabular-nums text-slate-600 dark:text-slate-400">{valueText ?? value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-8 w-full accent-accent"
      />
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const v = e.target.valueAsNumber;
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className={inputClass}
        />
        {suffix && <span className="text-sm text-slate-600 dark:text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
