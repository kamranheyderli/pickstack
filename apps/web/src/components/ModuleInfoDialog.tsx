import { getModule, type Selection } from "@stackforge/core";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "../i18n";
import { formatSize, moduleSize } from "../lib/bundleSize";
import { BrandIcon, LetterIcon, moduleIcons, UiIcon } from "../lib/icons";
import { moduleEffect, type ModuleEffectResult } from "../lib/moduleEffect";
import { reasonText } from "./OptionsPanel";

interface ModuleInfoDialogProps {
  /** The module to explain, or null when closed. */
  id: string | null;
  selection: Selection;
  onClose: () => void;
}

/** Files listed by name; the rest are counted. */
const FILES = 10;

/**
 * What a module is and what it would do to this project: the files it adds or changes and the
 * packages it brings, worked out by generating the project with and without it.
 */
export function ModuleInfoDialog({
  id,
  selection,
  onClose,
}: ModuleInfoDialogProps) {
  const t = useT();
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<{
    id: string;
    value: ModuleEffectResult;
  } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (id && !dialog.open) dialog.showModal();
    else if (!id && dialog.open) dialog.close();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void moduleEffect(selection, id).then((value) => {
      if (!cancelled) setResult({ id, value });
    });
    return () => {
      cancelled = true;
    };
  }, [id, selection]);

  const mod = id ? getModule(id) : undefined;
  const icon = id ? moduleIcons[id] : undefined;
  const loaded = result && result.id === id ? result.value : null;
  const size = id ? moduleSize(selection.framework, id) : undefined;
  const name = (moduleId: string) => getModule(moduleId)?.name ?? moduleId;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="module-info-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-0 text-ink shadow-2xl outline-none backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {mod && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            {icon ? (
              <BrandIcon icon={icon} size={20} />
            ) : (
              <LetterIcon label={mod.name} size={20} />
            )}
            <h2 id="module-info-title" className="m-0 text-base font-semibold">
              {mod.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("github.close")}
              className="ml-auto cursor-pointer rounded-md p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <UiIcon name="close" size={16} />
            </button>
          </div>
          <p className="m-0 text-sm text-muted">{mod.description[locale]}</p>

          {!loaded && (
            <p role="status" className="m-0 text-sm text-muted">
              {t("info.working")}
            </p>
          )}

          {loaded && !loaded.ok && (
            <p className="m-0 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm">
              {reasonText(loaded.error, selection, t)}
            </p>
          )}

          {loaded?.ok && (
            <>
              {size !== undefined && (
                <p className="m-0 text-sm" title={t("size.hint")}>
                  {size <= 0
                    ? t("info.sizeNone")
                    : t("info.size", { size: formatSize(size, locale) })}
                </p>
              )}
              {loaded.effect.alsoAdded.length > 0 && (
                <p className="m-0 text-sm">
                  {t("info.alsoAdds", {
                    modules: loaded.effect.alsoAdded.map(name).join(", "),
                  })}
                </p>
              )}
              <section className="flex flex-col gap-1.5">
                <h3 className="m-0 text-xs font-medium tracking-wider text-muted uppercase">
                  {t("info.files", {
                    added: loaded.effect.added.length,
                    changed: loaded.effect.changed.length,
                  })}
                </h3>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-xs">
                  {[
                    ...loaded.effect.added.map((path) => ({
                      path,
                      added: true,
                    })),
                    ...loaded.effect.changed.map((path) => ({
                      path,
                      added: false,
                    })),
                  ]
                    .slice(0, FILES)
                    .map(({ path, added }) => (
                      <li key={path} className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`size-1.5 shrink-0 rounded-full ${added ? "bg-emerald-500" : "bg-amber-500"}`}
                        />
                        <span className="truncate">{path}</span>
                        <span className="sr-only">
                          {added
                            ? t("changes.newFile")
                            : t("changes.changedFile")}
                        </span>
                      </li>
                    ))}
                </ul>
                {loaded.effect.added.length + loaded.effect.changed.length >
                  FILES && (
                  <p className="m-0 text-xs text-muted">
                    {t("info.more", {
                      count:
                        loaded.effect.added.length +
                        loaded.effect.changed.length -
                        FILES,
                    })}
                  </p>
                )}
              </section>
              {loaded.effect.packages.length > 0 && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="m-0 text-xs font-medium tracking-wider text-muted uppercase">
                    {t("info.packages")}
                  </h3>
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {loaded.effect.packages.map((pkg) => (
                      <li key={pkg}>
                        <a
                          href={`https://www.npmjs.com/package/${pkg}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-md border border-line bg-panel-2 px-2 py-0.5 font-mono text-xs text-ink no-underline hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {pkg}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
