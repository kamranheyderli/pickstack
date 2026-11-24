import {
  frameworkCatalog,
  frameworks,
  type FrameworkId,
} from "@stackforge/core";
import { useId } from "react";
import { useT } from "../i18n";
import { BrandIcon, frameworkIcons, UiIcon } from "../lib/icons";

const ready = new Set<string>(frameworks.map((f) => f.id));

interface FrameworkPickerProps {
  value: FrameworkId;
  onChange: (id: FrameworkId) => void;
}

export function FrameworkPicker({ value, onChange }: FrameworkPickerProps) {
  const t = useT();
  const id = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{t("section.framework")}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {frameworkCatalog.map((fw) => {
          const available = ready.has(fw.id);
          const icon = frameworkIcons[fw.id];
          const reasonId = `${id}-${fw.id}`;
          return (
            <label key={fw.id} className="group relative">
              <input
                type="radio"
                name="framework"
                value={fw.id}
                checked={fw.id === value}
                disabled={!available}
                aria-describedby={available ? undefined : reasonId}
                onChange={() => onChange(fw.id)}
                className="peer absolute opacity-0"
              />
              <span className="flex h-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-panel p-3 shadow-xs transition hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-md peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:shadow-[0_0_0_3px_var(--color-accent-ring)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-55 peer-disabled:hover:translate-y-0 peer-disabled:hover:shadow-xs motion-reduce:transition-none motion-reduce:hover:translate-y-0 [&_.fw-check]:hidden peer-checked:[&_.fw-check]:grid">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl"
                  style={{
                    background: `color-mix(in srgb, #${icon.hex} 14%, transparent)`,
                  }}
                >
                  <BrandIcon icon={icon} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {fw.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {available
                      ? t(`framework.kind.${fw.kind}`)
                      : t("framework.soon")}
                  </span>
                </span>
                <span className="fw-check size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                  <UiIcon name="check" size={12} />
                </span>
              </span>
              {!available && (
                <span id={reasonId} className="sr-only">
                  {t("reason.framework-soon", {
                    framework: fw.name,
                    phase: fw.phase,
                  })}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
