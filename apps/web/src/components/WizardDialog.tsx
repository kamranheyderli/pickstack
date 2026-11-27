import { getFramework, getModule, type Selection } from "@stackforge/core";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "../i18n";
import {
  BrandIcon,
  frameworkIcons,
  LetterIcon,
  moduleIcons,
  UiIcon,
} from "../lib/icons";
import {
  extras,
  goals,
  preferences,
  recommend,
  type Extra,
  type Goal,
  type Preference,
} from "../lib/wizard";

interface WizardDialogProps {
  open: boolean;
  selection: Selection;
  onApply: (next: Selection) => void;
  onClose: () => void;
}

const pill =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-sm transition hover:border-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-ink";

/**
 * "What are you building?": three questions that turn into a stack, shown with why each part
 * is there before it replaces the current selection.
 */
export function WizardDialog({
  open,
  selection,
  onApply,
  onClose,
}: WizardDialogProps) {
  const t = useT();
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const [goal, setGoal] = useState<Goal>("app");
  const [preference, setPreference] = useState<Preference>("any");
  const [picked, setPicked] = useState<Extra[]>([]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const { selection: next, unavailable } = recommend(
    { goal, preference, extras: picked },
    selection,
  );
  const framework = getFramework(next.framework);
  const frameworkName = framework?.name ?? next.framework;
  const toggle = (extra: Extra) =>
    setPicked((list) =>
      list.includes(extra) ? list.filter((e) => e !== extra) : [...list, extra],
    );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="wizard-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-0 text-ink shadow-2xl outline-none backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1">
              <h2
                id="wizard-title"
                className="m-0 flex items-center gap-2 text-base font-semibold"
              >
                <UiIcon name="sparkles" />
                {t("wizard.title")}
              </h2>
              <p className="m-0 text-sm text-muted">{t("wizard.intro")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("github.close")}
              className="ml-auto cursor-pointer rounded-md p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <UiIcon name="close" size={16} />
            </button>
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-xs font-medium tracking-wider text-muted uppercase">
              1. {t("wizard.goal")}
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {goals.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={goal === g}
                  onClick={() => setGoal(g)}
                  className={`${pill} flex-col items-start gap-0.5 text-left`}
                >
                  <span className="font-semibold">{t(`wizard.goal.${g}`)}</span>
                  <span className="text-xs text-muted">
                    {t(`wizard.goal.${g}.hint`)}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-xs font-medium tracking-wider text-muted uppercase">
              2. {t("wizard.preference")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {preferences.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={preference === p}
                  onClick={() => setPreference(p)}
                  className={pill}
                >
                  {p !== "any" && (
                    <BrandIcon icon={frameworkIcons[p]} size={14} />
                  )}
                  {p === "any"
                    ? t("wizard.preference.any")
                    : (getFramework(p)?.name ?? p)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-xs font-medium tracking-wider text-muted uppercase">
              3. {t("wizard.extras")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {extras.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={picked.includes(e)}
                  onClick={() => toggle(e)}
                  className={pill}
                >
                  {picked.includes(e) && <UiIcon name="check" size={14} />}
                  {t(`wizard.extra.${e}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <section
            aria-labelledby="wizard-result"
            aria-live="polite"
            className="flex flex-col gap-3 rounded-xl border border-line bg-panel-2 p-4"
          >
            <h3
              id="wizard-result"
              className="m-0 flex items-center gap-2 text-sm font-semibold"
            >
              <BrandIcon icon={frameworkIcons[next.framework]} size={16} />
              {t("wizard.result")}: {frameworkName}
            </h3>
            <p className="m-0 text-sm text-muted">
              {t(`wizard.why.${goal}`, { framework: frameworkName })}
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {next.modules.map((id) => {
                const mod = getModule(id);
                if (!mod) return null;
                const icon = moduleIcons[id];
                return (
                  <li key={id} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0">
                      {icon ? (
                        <BrandIcon icon={icon} size={14} />
                      ) : (
                        <LetterIcon label={mod.name} size={14} />
                      )}
                    </span>
                    <span>
                      <span className="font-medium">{mod.name}</span>
                      <span className="text-muted">
                        {" "}
                        · {mod.description[locale]}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {unavailable.length > 0 && (
              <p className="m-0 text-xs text-muted">
                {t("wizard.unavailable", {
                  framework: frameworkName,
                  extras: unavailable
                    .map((e) => t(`wizard.extra.${e}`))
                    .join(", "),
                })}
              </p>
            )}
          </section>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-2 border-t border-line bg-panel px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm font-semibold text-ink/85 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("wizard.cancel")}
            </button>
            <button
              type="button"
              onClick={() => onApply(next)}
              className="cursor-pointer rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-panel hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("wizard.apply")}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
