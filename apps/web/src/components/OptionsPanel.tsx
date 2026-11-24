import {
  frameworkCatalog,
  getModule,
  toProjectName,
  type Language,
  type PackageManager,
  type Selection,
  type ValidationError,
} from "@stackforge/core";
import { useLocale, useT, type Translate } from "../i18n";
import {
  BrandIcon,
  languageIcons,
  LetterIcon,
  moduleIcons,
  packageManagerIcons,
  UiIcon,
} from "../lib/icons";
import { chooseSingle, groupOptions, toggleModule } from "../state/selection";
import { Chips } from "./Chips";
import { Segmented } from "./Segmented";

const packageManagers: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];
const languages: Language[] = ["ts", "js"];
const NONE = "";

interface OptionsPanelProps {
  selection: Selection;
  autoAdded: string[];
  onChange: (next: Selection) => void;
  /** Language changes go through here so incompatible modules are pruned. */
  onBaseChange: (next: Selection) => void;
}

export function OptionsPanel({
  selection,
  autoAdded,
  onChange,
  onBaseChange,
}: OptionsPanelProps) {
  const t = useT();
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label
          htmlFor="project-name"
          className="mb-2.5 block text-xs font-medium tracking-wider text-muted uppercase"
        >
          {t("field.name")}
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-panel-2 px-3 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-ring)]">
          <span className="text-muted">
            <UiIcon name="folder" />
          </span>
          <input
            id="project-name"
            type="text"
            value={selection.name}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onChange({ ...selection, name: e.target.value })}
            className="w-full bg-transparent py-2.5 font-mono text-sm outline-none"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {t("field.nameHint", { name: toProjectName(selection.name) })}
        </p>
      </div>

      <Segmented
        legend={t("field.language")}
        name="language"
        value={selection.language}
        options={languages.map((l) => ({
          value: l,
          label: t(`language.${l}`),
          icon: <BrandIcon icon={languageIcons[l]} size={15} />,
        }))}
        onChange={(language) => onBaseChange({ ...selection, language })}
      />

      {groupOptions(selection).map((group) => {
        const items = group.options.map(({ module, checked, blocker }) => {
          const icon = moduleIcons[module.id];
          return {
            value: module.id,
            label: module.name,
            checked,
            icon: icon ? (
              <BrandIcon icon={icon} size={16} />
            ) : (
              <LetterIcon label={module.name} size={16} />
            ),
            disabled: !checked && blocker !== null,
            reason: blocker ? reasonText(blocker, selection, t) : undefined,
            badge: autoAdded.includes(module.id) ? t("badge.auto") : undefined,
            description: module.description[locale],
          };
        });
        return group.single ? (
          <Chips
            key={group.category}
            legend={t(`category.${group.category}`)}
            name={group.category}
            type="radio"
            items={[
              {
                value: NONE,
                label: t("option.none"),
                checked: !items.some((i) => i.checked),
              },
              ...items,
            ]}
            onChange={(id) =>
              onChange(chooseSingle(selection, group.category, id || null))
            }
          />
        ) : (
          <Chips
            key={group.category}
            legend={t(`category.${group.category}`)}
            name={group.category}
            type="checkbox"
            items={items}
            onChange={(id) => onChange(toggleModule(selection, id))}
          />
        );
      })}

      <Segmented
        legend={t("field.packageManager")}
        name="packageManager"
        value={selection.packageManager}
        options={packageManagers.map((pm) => ({
          value: pm,
          label: pm,
          icon: <BrandIcon icon={packageManagerIcons[pm]} size={14} />,
        }))}
        onChange={(packageManager) =>
          onChange({ ...selection, packageManager })
        }
      />
    </div>
  );
}

function reasonText(
  error: ValidationError,
  selection: Selection,
  t: Translate,
): string {
  const name = (id?: string) => (id ? (getModule(id)?.name ?? id) : "");
  const framework =
    frameworkCatalog.find((f) => f.id === selection.framework)?.name ??
    selection.framework;
  const vars = {
    module: name(error.moduleId),
    other: name(error.otherId),
    framework,
  };
  switch (error.code) {
    case "conflict":
    case "framework-mismatch":
    case "language-mismatch":
    case "unknown-module":
      return t(`reason.${error.code}`, vars);
    default:
      return t("reason.other");
  }
}
