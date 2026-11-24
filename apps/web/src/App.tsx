import {
  getModule,
  installCommand,
  runCommand,
  toProjectName,
  type Selection,
} from "@stackforge/core";
import { useEffect, useState } from "react";
import { CodeView } from "./components/CodeView";
import { FileTree } from "./components/FileTree";
import { FrameworkPicker } from "./components/FrameworkPicker";
import { OptionsPanel } from "./components/OptionsPanel";
import {
  LocaleProvider,
  translate,
  type Locale,
  type MessageKey,
} from "./i18n";
import { downloadZip } from "./lib/download";
import { UiIcon } from "./lib/icons";
import { readPref, writePref } from "./lib/storage";
import { useGenerated } from "./lib/useGenerated";
import { useTheme } from "./lib/useTheme";
import { defaultSelection, pruneIncompatible } from "./state/selection";

const locales = ["az", "en"] as const;
const themeIcon = { system: "monitor", light: "sun", dark: "moon" } as const;

export default function App() {
  const [locale, setLocale] = useState<Locale>(() =>
    readPref("locale", locales, "az"),
  );
  const [theme, cycleTheme] = useTheme();
  const [selection, setSelection] = useState<Selection>(defaultSelection);
  const [notice, setNotice] = useState("");
  const [current, setCurrent] = useState("src/App.tsx");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const generated = useGenerated(selection);
  const [seen, setSeen] = useState(generated.result);

  const t = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const names = (ids: string[]) =>
    ids.map((id) => getModule(id)?.name ?? id).join(", ");

  const result = generated.result;
  if (result !== seen) {
    setSeen(result);
    setGeneration((g) => g + 1);
  }
  const files = result?.ok ? result.files : null;
  const activePath =
    files && !files.has(current)
      ? ([...files.keys()].find((p) => /^src\/App\.\w+$/.test(p)) ??
        "package.json")
      : current;
  const projectName = toProjectName(selection.name);

  // `lang` drives case mapping too: uppercase "i" is "İ" in Azerbaijani, "I" in English.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    writePref("locale", next);
  };

  const onBaseChange = (next: Selection) => {
    const pruned = pruneIncompatible(next);
    setSelection(pruned.selection);
    setNotice(
      pruned.removed.length
        ? t("notice.removed", { modules: names(pruned.removed) })
        : "",
    );
  };

  const onDownload = async () => {
    if (!files) return;
    setBusy(true);
    setStatus(t("download.busy"));
    try {
      const file = await downloadZip(projectName, files);
      setStatus(
        t("download.done", {
          file,
          install: installCommand(selection.packageManager),
          dev: runCommand(selection.packageManager, "dev"),
        }),
      );
    } catch (error) {
      setStatus(
        t("download.error", {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <LocaleProvider locale={locale}>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-accent to-accent-2 text-white shadow-sm">
              <UiIcon name="sparkles" size={15} />
            </span>
            {t("app.title")}
          </a>
          <div className="flex items-center gap-2 text-sm">
            <div
              role="group"
              aria-label={t("settings.uiLanguage")}
              className="flex rounded-lg border border-line bg-panel-2 p-0.5"
            >
              {locales.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={locale === l}
                  onClick={() => changeLocale(l)}
                  className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold text-muted uppercase transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-panel aria-pressed:text-ink aria-pressed:shadow-sm"
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={t("settings.theme", { theme: t(`theme.${theme}`) })}
              title={t("settings.theme", { theme: t(`theme.${theme}`) })}
              className="grid size-8 cursor-pointer place-items-center rounded-lg border border-line bg-panel-2 text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <UiIcon name={themeIcon[theme]} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 pt-12 pb-16 sm:px-6">
        <section className="mb-10 max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-muted shadow-xs">
            <span
              className="size-1.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            {t("hero.badge")}
          </p>
          <h1 className="mb-4 text-[clamp(2.2rem,5.5vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
            {t("hero.title")}{" "}
            <span className="bg-linear-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              {t("hero.titleAccent")}
            </span>
          </h1>
          <p className="m-0 max-w-[58ch] text-lg text-muted">
            {t("app.tagline")}
          </p>
        </section>

        <section aria-labelledby="framework-heading" className="mb-8">
          <h2 id="framework-heading" className="mb-4 text-sm font-semibold">
            <span className="mr-2 text-muted">01</span>
            {t("section.framework")}
          </h2>
          <FrameworkPicker
            value={selection.framework}
            onChange={(framework) => onBaseChange({ ...selection, framework })}
          />
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
          <form
            aria-labelledby="configure-heading"
            onSubmit={(e) => e.preventDefault()}
            className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6"
          >
            <h2
              id="configure-heading"
              className="mt-0 mb-5 text-sm font-semibold"
            >
              <span className="mr-2 text-muted">02</span>
              {t("section.configure")}
            </h2>
            <OptionsPanel
              selection={selection}
              autoAdded={result?.ok ? result.autoAdded : []}
              onChange={(next) => {
                setSelection(next);
                setNotice("");
              }}
              onBaseChange={onBaseChange}
            />
            {notice && (
              <p className="mt-5 mb-0 text-sm text-muted" role="status">
                {notice}
              </p>
            )}
            {result?.ok && result.autoAdded.length > 0 && (
              <p className="mt-5 mb-0 text-sm text-muted">
                {t("notice.autoAdded", { modules: names(result.autoAdded) })}
              </p>
            )}
            {result && !result.ok && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm"
              >
                <p className="m-0 font-semibold">{t("errors.title")}</p>
                <ul className="mt-1 mb-0 pl-5">
                  {result.errors.map((e) => (
                    <li key={e.message}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          <section
            aria-label={t("preview.label")}
            aria-busy={generated.pending}
            className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)] lg:sticky lg:top-20"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="size-3 rounded-full bg-[#ff5f57]" />
                  <span className="size-3 rounded-full bg-[#febc2e]" />
                  <span className="size-3 rounded-full bg-[#28c840]" />
                </span>
                <span className="truncate font-mono text-sm font-medium">
                  {projectName}/
                </span>
                {files && (
                  <span className="rounded-md bg-panel-2 px-2 py-0.5 text-xs text-muted">
                    {t("preview.files", { count: files.size })}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={!files || busy}
                onClick={onDownload}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-bg shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-progress disabled:opacity-50"
              >
                <UiIcon name="download" />
                {t("download.button")}
              </button>
            </div>

            {files ? (
              <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                <FileTree
                  paths={[...files.keys()]}
                  current={activePath}
                  changed={generated.changed}
                  generation={generation}
                  label={t("preview.tree")}
                  onSelect={setCurrent}
                />
                <CodeView
                  path={activePath}
                  code={files.get(activePath) ?? ""}
                />
              </div>
            ) : (
              <p className="m-0 h-[min(68vh,640px)] p-6 text-muted">
                {t("preview.generating")}
              </p>
            )}

            <p
              className="m-0 border-t border-line px-4 py-2.5 text-xs text-muted"
              role="status"
              aria-live="polite"
            >
              {status ?? t("download.hint")}
            </p>
          </section>
        </div>
      </main>
    </LocaleProvider>
  );
}
