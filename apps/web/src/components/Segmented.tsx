import type { ReactNode } from "react";

interface SegmentedProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 text-xs font-medium tracking-wider text-muted uppercase">
        {legend}
      </legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line bg-panel-2 p-1">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer absolute opacity-0"
            />
            <span className="flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition select-none hover:text-ink peer-checked:bg-panel peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-accent motion-reduce:transition-none">
              {option.icon}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
