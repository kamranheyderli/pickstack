import {
  frameworkCatalog,
  getFramework,
  presets,
  type Selection,
} from "@stackforge/core";
import type { PaletteCommand } from "../components/CommandPalette";
import { reasonText } from "../components/OptionsPanel";
import type { Locale, Translate } from "../i18n";
import { chooseSingle, groupOptions, toggleModule } from "../state/selection";
import {
  BrandIcon,
  LetterIcon,
  UiIcon,
  frameworkIcons,
  moduleIcons,
  type UiIconName,
} from "./icons";

interface PaletteContext {
  selection: Selection;
  t: Translate;
  locale: Locale;
  /** A module change: keeps the framework, so nothing is pruned. */
  onChange: (next: Selection) => void;
  /** A framework change: prunes modules that no longer fit. */
  onBaseChange: (next: Selection) => void;
  download: () => void;
  copyLink: () => void;
  copyCommand: () => void;
  cycleTheme: () => void;
  toggleLocale: () => void;
}

/** Actions first, then presets, frameworks and the current framework's modules. */
export function paletteCommands(ctx: PaletteContext): PaletteCommand[] {
  const { selection, t, locale } = ctx;
  const action = (
    id: string,
    label: string,
    icon: UiIconName,
    run: () => void,
  ): PaletteCommand => ({
    id,
    group: t("palette.actions"),
    label,
    icon: <UiIcon name={icon} size={15} />,
    run,
  });
  const actions = [
    action("download", t("download.button"), "download", ctx.download),
    action("link", t("share.button"), "link", ctx.copyLink),
    action("command", t("palette.copyCommand"), "terminal", ctx.copyCommand),
    action("theme", t("palette.theme"), "moon", ctx.cycleTheme),
    action("locale", t("palette.locale"), "sparkles", ctx.toggleLocale),
  ];

  const presetCommands: PaletteCommand[] = presets.map((preset) => ({
    id: `preset:${preset.id}`,
    group: t("palette.presets"),
    label: preset.name,
    keywords: preset.description[locale],
    icon: <BrandIcon icon={frameworkIcons[preset.framework]} size={15} />,
    run: () =>
      ctx.onBaseChange({
        ...selection,
        framework: preset.framework,
        modules: preset.modules,
      }),
  }));

  const frameworkCommands: PaletteCommand[] = frameworkCatalog
    .filter((f) => getFramework(f.id))
    .map((f) => ({
      id: `framework:${f.id}`,
      group: t("palette.frameworks"),
      label: f.name,
      checked: selection.framework === f.id,
      icon: <BrandIcon icon={frameworkIcons[f.id]} size={15} />,
      run: () => ctx.onBaseChange({ ...selection, framework: f.id }),
    }));

  const moduleCommands: PaletteCommand[] = groupOptions(selection).flatMap(
    (group) =>
      group.options.map(({ module, checked, blocker }) => {
        const icon = moduleIcons[module.id];
        const category = t(`category.${group.category}`);
        return {
          id: `module:${module.id}`,
          group: t("palette.modules"),
          label: module.name,
          keywords: `${category} ${module.description[locale]}`,
          checked,
          disabledReason:
            !checked && blocker ? reasonText(blocker, selection, t) : undefined,
          keepOpen: true,
          icon: icon ? (
            <BrandIcon icon={icon} size={15} />
          ) : (
            <LetterIcon label={module.name} size={15} />
          ),
          run: () =>
            ctx.onChange(
              group.single
                ? chooseSingle(
                    selection,
                    group.category,
                    checked ? null : module.id,
                  )
                : toggleModule(selection, module.id),
            ),
        };
      }),
  );

  return [
    ...actions,
    ...presetCommands,
    ...frameworkCommands,
    ...moduleCommands,
  ];
}
