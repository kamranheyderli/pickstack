import {
  frameworkCatalog,
  frameworks,
  type FrameworkId,
} from "@stackforge/core";
import { useId } from "react";
import { useT } from "../i18n";
import { BrandIcon, frameworkIcons } from "../lib/icons";

const ready = new Set<string>(frameworks.map((f) => f.id));

interface FrameworkPickerProps {
  value: FrameworkId;
  onChange: (id: FrameworkId) => void;
}

export function FrameworkPicker({ value, onChange }: FrameworkPickerProps) {
  const t = useT();
  const id = useId();
  const spa = frameworkCatalog.filter((fw) => fw.kind === "spa");
  const meta = frameworkCatalog.filter((fw) => fw.kind !== "spa");
  const pill = (fw: (typeof frameworkCatalog)[number]) => {
    const available = ready.has(fw.id);
    const icon = frameworkIcons[fw.id];
    const reasonId = `${id}-${fw.id}`;
    const kind = available
      ? t(`framework.kind.${fw.kind}`)
      : t("framework.soon");
    return (
      <label key={fw.id} className="relative" title={kind}>
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
        <span className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel py-1.5 pr-3 pl-1.5 text-sm font-semibold shadow-xs transition select-none hover:border-ink/25 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:shadow-[0_0_0_3px_var(--color-accent-ring)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-55 motion-reduce:transition-none">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-lg"
            style={{
              background: `color-mix(in srgb, #${icon.hex} 14%, transparent)`,
            }}
          >
            <BrandIcon icon={icon} size={16} />
          </span>
          {fw.name}
        </span>
        <span id={reasonId} className="sr-only">
          {available
            ? kind
            : t("reason.framework-soon", {
                framework: fw.name,
                phase: fw.phase,
              })}
        </span>
      </label>
    );
  };
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{t("section.framework")}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {spa.map(pill)}
        {/* SPAs, then meta-frameworks. */}
        <span
          className="mx-1 hidden h-6 w-px bg-line sm:block"
          aria-hidden="true"
        />
        {meta.map(pill)}
      </div>
    </fieldset>
  );
}
