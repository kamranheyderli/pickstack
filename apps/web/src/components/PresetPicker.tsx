import { presets, type Preset } from "@stackforge/core";
import { useLocale, useT } from "../i18n";
import { BrandIcon, frameworkIcons } from "../lib/icons";

interface PresetPickerProps {
  /** The preset the current selection matches exactly, if any. */
  active: string | null;
  onPick: (preset: Preset) => void;
}

export function PresetPicker({ active, onPick }: PresetPickerProps) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium text-muted">
        {t("preset.label")}
      </span>
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          aria-pressed={active === preset.id}
          title={preset.description[locale]}
          onClick={() => onPick(preset)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-panel py-0.5 pr-2.5 pl-1 text-xs font-medium text-ink/85 transition hover:border-ink/25 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-ink"
        >
          <BrandIcon icon={frameworkIcons[preset.framework]} size={13} />
          {preset.name}
        </button>
      ))}
    </div>
  );
}
