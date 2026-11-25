import { getModule, presets, type Preset } from "@stackforge/core";
import { useLocale, useT } from "../i18n";
import { BrandIcon, frameworkIcons, moduleIcons } from "../lib/icons";

interface PresetPickerProps {
  /** The preset the current selection matches exactly, if any. */
  active: string | null;
  onPick: (preset: Preset) => void;
}

/** How many module logos a card shows before "+N". */
const LOGOS = 5;

export function PresetPicker({ active, onPick }: PresetPickerProps) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
      {presets.map((preset) => {
        const logos = preset.modules.flatMap((id) => {
          const icon = moduleIcons[id];
          return icon ? [{ id, icon }] : [];
        });
        const pressed = active === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onPick(preset)}
            className="group flex w-64 shrink-0 snap-start cursor-pointer flex-col gap-2 rounded-xl border border-line bg-panel/80 p-3 text-left shadow-xs backdrop-blur transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:shadow-[0_0_0_3px_var(--color-accent-ring)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, #${frameworkIcons[preset.framework].hex} 14%, transparent)`,
                }}
              >
                <BrandIcon icon={frameworkIcons[preset.framework]} size={15} />
              </span>
              {preset.name}
            </span>
            <span className="line-clamp-2 text-xs text-muted">
              {preset.description[locale]}
            </span>
            <span
              className="mt-auto flex items-center gap-1.5"
              aria-label={t("preset.includes", {
                modules: preset.modules
                  .map((id) => getModule(id)?.name ?? id)
                  .join(", "),
              })}
            >
              {logos.slice(0, LOGOS).map(({ id, icon }) => (
                <span
                  key={id}
                  title={getModule(id)?.name}
                  className="grid size-5 place-items-center rounded-md bg-panel-2"
                >
                  <BrandIcon icon={icon} size={11} />
                </span>
              ))}
              {preset.modules.length > LOGOS && (
                <span className="text-[0.65rem] font-medium text-muted">
                  +{preset.modules.length - Math.min(LOGOS, logos.length)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
