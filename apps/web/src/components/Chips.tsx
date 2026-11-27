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
  /** Makes the group collapsible: the legend becomes a toggle with a selected count. */
  collapse?: { open: boolean; onToggle: () => void };
  /** Every option is blocked for the same reason (e.g. no form library yet): shown when closed. */
  locked?: string;
}

/** Icons shown on a closed group with nothing picked, as a hint of what's inside. */
const PEEK = 4;

export function Chips({
  legend,
  name,
  type,
  items,
  onChange,
  collapse,
  locked,
}: ChipsProps) {
  const id = useId();
  const open = collapse?.open ?? true;
  const picked = items.filter((i) => i.checked);
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 w-full text-[0.7rem] font-medium tracking-wider text-muted uppercase">
        {collapse ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            onClick={collapse.onToggle}
            className="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left tracking-wider uppercase transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span
              aria-hidden="true"
              className={`inline-flex transition-transform motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
            >
              <UiIcon name="chevron" size={11} />
            </span>
            {legend}
            {picked.length > 0 && (
              <span className="rounded-full bg-accent-soft px-1.5 text-[0.65rem] font-semibold text-accent normal-case">
                {picked.length}
              </span>
            )}
            {!open && picked.length > 0 && (
              <span className="ml-auto truncate font-normal tracking-normal normal-case">
                {picked.map((i) => i.label).join(", ")}
              </span>
            )}
            {!open && picked.length === 0 && locked && (
              <span className="ml-auto flex min-w-0 items-center gap-1 font-normal tracking-normal normal-case">
                <UiIcon name="lock" size={11} />
                <span className="truncate">{locked}</span>
              </span>
            )}
            {!open && picked.length === 0 && !locked && (
              <span
                aria-hidden="true"
                className="ml-auto flex shrink-0 items-center gap-1"
              >
                {items.slice(0, PEEK).map((i) => (
                  <span key={i.value} className="inline-flex opacity-70">
                    {i.icon}
                  </span>
                ))}
                {items.length > PEEK && (
                  <span className="text-[0.65rem] font-normal tracking-normal">
                    +{items.length - PEEK}
                  </span>
                )}
              </span>
            )}
          </button>
        ) : (
          legend
        )}
      </legend>
      <div
        id={`${id}-options`}
        hidden={!open}
        className="flex flex-wrap gap-1.5"
      >
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
              <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1 text-[0.8rem] font-medium shadow-xs transition select-none hover:border-ink/25 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-40 motion-reduce:transition-none [&_.chip-check]:hidden peer-checked:[&_.chip-check]:inline-flex">
                {item.icon}
                {item.label}
                {item.badge && (
                  <span className="rounded-md bg-accent px-1.5 py-px text-[0.65rem] font-semibold tracking-wide text-accent-ink uppercase">
                    {item.badge}
                  </span>
                )}
                <span className="chip-check text-accent">
                  <UiIcon name="check" size={12} />
                </span>
                {item.disabled && (
                  <span aria-hidden="true" className="text-muted">
                    <UiIcon name="lock" size={11} />
                  </span>
                )}
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
