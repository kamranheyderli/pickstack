import { useId, type ReactNode } from "react";
import { UiIcon } from "../lib/icons";

export interface ChipItem {
  value: string;
  label: string;
  checked: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  /** Shown as a tooltip and read by screen readers when the chip is disabled. */
  reason?: string;
  badge?: string;
  description?: string;
}

interface ChipsProps {
  legend: string;
  name: string;
  type: "radio" | "checkbox";
  items: ChipItem[];
  onChange: (value: string) => void;
}

export function Chips({ legend, name, type, items, onChange }: ChipsProps) {
  const id = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 text-xs font-medium tracking-wider text-muted uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const reasonId = `${id}-${item.value}-reason`;
          return (
            <label
              key={item.value}
              className="relative"
              title={item.disabled ? item.reason : item.description}
            >
              <input
                type={type}
                name={name}
                value={item.value}
                checked={item.checked}
                disabled={item.disabled}
                aria-describedby={
                  item.disabled && item.reason ? reasonId : undefined
                }
                onChange={() => onChange(item.value)}
                className="peer absolute opacity-0"
              />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm font-medium shadow-xs transition select-none hover:border-ink/25 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-40 motion-reduce:transition-none [&_.chip-check]:hidden peer-checked:[&_.chip-check]:inline-flex">
                {item.icon}
                {item.label}
                {item.badge && (
                  <span className="rounded-md bg-accent px-1.5 py-px text-[0.65rem] font-semibold tracking-wide text-accent-ink uppercase">
                    {item.badge}
                  </span>
                )}
                <span className="chip-check text-accent">
                  <UiIcon name="check" size={14} />
                </span>
              </span>
              {item.disabled && item.reason && (
                <span id={reasonId} className="sr-only">
                  {item.reason}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
