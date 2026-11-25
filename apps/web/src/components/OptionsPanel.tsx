import {
  frameworkCatalog,
  getFramework,
  getModule,
  requiredOneOf,
  toProjectName,
  type Category,
  type Language,
  type PackageManager,
  type Selection,
  type ValidationError,
} from "@stackforge/core";
import { useState } from "react";
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
const languageOrder: Language[] = ["ts", "js"];

interface OptionsPanelProps {
  selection: Selection;
  autoAdded: string[];
  onChange: (next: Selection) => void;
  /** Language changes go through here so incompatible modules are pruned. */
  onBaseChange: (next: Selection) => void;
}

/** Open at first even without a pick: the choices most projects make. */
const DEFAULT_OPEN: ReadonlySet<Category> = new Set(["style", "ui", "state"]);

export function OptionsPanel({
  selection,
  autoAdded,
  onChange,
  onBaseChange,
}: OptionsPanelProps) {
  const t = useT();
  const locale = useLocale();
  // Categories the user opened or closed; the rest follow `defaultOpen`.
  const [open, setOpen] = useState<Partial<Record<Category, boolean>>>({});
  const isOpen = (category: Category, hasPick: boolean) =>
    open[category] ?? (hasPick || DEFAULT_OPEN.has(category));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="project-name"
          className="mb-1.5 block text-[0.7rem] font-medium tracking-wider text-muted uppercase"
        >
          {t("field.name")}
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-2.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-ring)]">
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
            className="w-full bg-transparent py-1.5 font-mono text-sm outline-none"
          />
        </div>
        <p className="mt-1 mb-0 text-xs text-muted">
          {t("field.nameHint", { name: toProjectName(selection.name) })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
        <Segmented
          legend={t("field.language")}
          name="language"
          value={selection.language}
          options={languageOrder
            .filter((l) =>
              getFramework(selection.framework)?.languages.includes(l),
            )
            .map((l) => ({
              value: l,
              label: t(`language.${l}`),
              icon: <BrandIcon icon={languageIcons[l]} size={15} />,
            }))}
          onChange={(language) => onBaseChange({ ...selection, language })}
        />

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

      {groupOptions(selection).map((group) => {
        const collapse = {
          open: isOpen(
            group.category,
            group.options.some((o) => o.checked),
          ),
          onToggle: () =>
            setOpen((prev) => ({
              ...prev,
              [group.category]: !isOpen(
                group.category,
                group.options.some((o) => o.checked),
              ),
            })),
        };
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
        // One pick at most: choosing replaces the current one, choosing it again clears it.
        return group.single ? (
          <Chips
            key={group.category}
            legend={t(`category.${group.category}`)}
            name={group.category}
            type="checkbox"
            items={items}
            collapse={collapse}
            onChange={(id) =>
              onChange(
                chooseSingle(
                  selection,
                  group.category,
                  items.find((i) => i.value === id)?.checked ? null : id,
                ),
              )
            }
          />
        ) : (
          <Chips
            key={group.category}
            legend={t(`category.${group.category}`)}
            name={group.category}
            type="checkbox"
            items={items}
            collapse={collapse}
            onChange={(id) => onChange(toggleModule(selection, id))}
          />
        );
      })}

      {selection.modules.includes("express") && (
        <p className="m-0 rounded-xl border border-line bg-panel-2 px-3 py-2.5 text-sm text-muted">
          {t("hint.serverLayout")}
        </p>
      )}

      {selection.framework === "svelte" && (
        <p className="m-0 rounded-xl border border-line bg-panel-2 px-3 py-2.5 text-sm text-muted">
          {t("hint.svelteRouting")}
        </p>
      )}
    </div>
  );
}

function requiredOneOfFor(id: string | undefined, selection: Selection) {
  const mod = id ? getModule(id) : undefined;
  return mod ? requiredOneOf(mod, selection.framework) : undefined;
}

export function reasonText(
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
    options: (requiredOneOfFor(error.moduleId, selection) ?? [])
      .map((id) => name(id))
      .join(", "),
  };
  switch (error.code) {
    case "conflict":
    case "framework-mismatch":
    case "language-mismatch":
    case "unknown-module":
    case "missing-one-of":
      return t(`reason.${error.code}`, vars);
    default:
      return t("reason.other");
  }
}
