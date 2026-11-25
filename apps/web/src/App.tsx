import {
  createCommand,
  getModule,
  installCommand,
  presets,
  runCommand,
  toProjectName,
  type Selection,
} from "@stackforge/core";
import { useEffect, useState } from "react";
import { CodeView } from "./components/CodeView";
import { CommandBar } from "./components/CommandBar";
import { Burst } from "./components/Burst";
import { Logo } from "./components/Logo";
import { CommandPalette } from "./components/CommandPalette";
import { FileTree } from "./components/FileTree";
import { FrameworkPicker } from "./components/FrameworkPicker";
import { OptionsPanel } from "./components/OptionsPanel";
import { PresetPicker } from "./components/PresetPicker";
import { Sky } from "./components/Sky";
import { TerminalDemo } from "./components/TerminalDemo";
import {
  LocaleProvider,
  translate,
  type Locale,
  type MessageKey,
} from "./i18n";
import { downloadZip } from "./lib/download";
import { UiIcon } from "./lib/icons";
import { readPref, writePref } from "./lib/storage";
import { paletteCommands } from "./lib/paletteCommands";
import { selectionFromQuery, selectionToQuery } from "./lib/url";
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
  // A shared link (?f=vue&m=pinia or ?p=<preset>) opens with that selection.
  const [selection, setSelection] = useState<Selection>(
    () =>
      selectionFromQuery(window.location.search, defaultSelection) ??
      defaultSelection,
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Bumped after each download; a new key replays the confetti.
  const [celebrations, setCelebrations] = useState(0);
  const [notice, setNotice] = useState("");
  const [current, setCurrent] = useState("src/App.tsx");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  // Files the user edited in the preview; they win over generated content.
  const [edits, setEdits] = useState<Map<string, string>>(() => new Map());
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
  const generatedFiles = result?.ok ? result.files : null;
  // Edits apply only to files the current selection still generates.
  const files = generatedFiles
    ? new Map(
        [...generatedFiles].map(([path, content]) => [
          path,
          edits.get(path) ?? content,
        ]),
      )
    : null;
  const edited = new Set(
    [...edits.keys()].filter((path) => generatedFiles?.has(path)),
  );
  const activePath =
    files && !files.has(current)
      ? ([...files.keys()].find((p) => /^src\/App\.\w+$/.test(p)) ??
        "package.json")
      : current;
  const projectName = toProjectName(selection.name);

  const sameModules = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  const activePreset =
    presets.find(
      (p) =>
        p.framework === selection.framework &&
        sameModules(p.modules, selection.modules),
    )?.id ?? null;

  // The address bar always holds the current selection, so it can be shared as is.
  useEffect(() => {
    window.history.replaceState(null, "", selectionToQuery(selection));
    setLinkCopied(false);
  }, [selection]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
    }
  };

  // `lang` drives case mapping too: uppercase "i" is "İ" in Azerbaijani, "I" in English.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // ⌘K / Ctrl+K anywhere, or "/" outside text fields, opens the command palette.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    writePref("locale", next);
  };

  const onBaseChange = (next: Selection) => {
    // Another framework generates different files; earlier edits would not apply.
    if (next.framework !== selection.framework) setEdits(new Map());
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
      setCelebrations((n) => n + 1);
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
      <Sky />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands({
          selection,
          t,
          locale,
          onChange: (next) => {
            setSelection(next);
            setNotice("");
          },
          onBaseChange,
          download: () => void onDownload(),
          copyLink: () => void copyLink(),
          copyCommand: () =>
            void navigator.clipboard
              .writeText(createCommand({ ...selection, name: projectName }))
              .catch(() => undefined),
          cycleTheme,
          toggleLocale: () => changeLocale(locale === "az" ? "en" : "az"),
        })}
      />
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-2.5 text-[1.05rem] font-bold tracking-[-0.03em]"
          >
            <Logo size={28} />
            {t("app.title")}
          </a>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden cursor-pointer items-center gap-2 rounded-lg border border-line bg-panel-2 py-1 pr-1.5 pl-2.5 text-xs text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent sm:inline-flex"
            >
              <UiIcon name="search" size={13} />
              {t("palette.open")}
              <kbd className="rounded border border-line bg-panel px-1 font-mono text-[0.65rem]">
                ⌘K
              </kbd>
            </button>
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

      <main className="mx-auto max-w-[1320px] px-4 pt-6 pb-10 sm:px-6">
        <section className="mb-6 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 px-2.5 py-0.5 text-xs font-medium text-muted shadow-xs backdrop-blur">
              <span
                className="size-1.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              {t("hero.badge")}
            </p>
            <h1 className="mb-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
              {t("hero.title")}{" "}
              <span className="bg-linear-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                {t("hero.titleAccent")}
              </span>
            </h1>
            <p className="m-0 max-w-[60ch] text-sm text-muted sm:text-base">
              {t("app.tagline")}
            </p>
          </div>
          <TerminalDemo
            command={createCommand({ ...selection, name: projectName })}
            output={[
              `◇ Created ${projectName}/ (${files?.size ?? 0} files)`,
              "◇ Initialized a git repository",
              `◇ Installed dependencies with ${selection.packageManager}`,
              `$ cd ${projectName} && ${runCommand(selection.packageManager, "dev")}`,
            ]}
          />
        </section>

        <section aria-labelledby="presets-heading" className="mb-6">
          <h2 id="presets-heading" className="mb-2 text-sm font-semibold">
            {t("preset.title")}
          </h2>
          <PresetPicker
            active={activePreset}
            onPick={(preset) =>
              onBaseChange({
                ...selection,
                framework: preset.framework,
                modules: preset.modules,
              })
            }
          />
        </section>

        <section aria-labelledby="framework-heading" className="mb-5">
          <h2 id="framework-heading" className="mb-2 text-sm font-semibold">
            <span className="mr-2 text-muted">01</span>
            {t("section.framework")}
          </h2>
          <FrameworkPicker
            value={selection.framework}
            onChange={(framework) => onBaseChange({ ...selection, framework })}
          />
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <form
            aria-labelledby="configure-heading"
            onSubmit={(e) => e.preventDefault()}
            className="rounded-2xl border border-line bg-panel p-4 shadow-sm sm:p-5"
          >
            <h2
              id="configure-heading"
              className="mt-0 mb-4 text-sm font-semibold"
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
            className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_24px_60px_-30px_rgb(0_0_0/0.35)] lg:sticky lg:top-18"
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
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm font-semibold text-ink/85 transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <UiIcon name={linkCopied ? "check" : "link"} />
                  <span aria-live="polite">
                    {linkCopied ? t("share.copied") : t("share.button")}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!files || busy}
                  onClick={onDownload}
                  className="relative inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-bg shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-progress disabled:opacity-50"
                >
                  <UiIcon name="download" />
                  {t("download.button")}
                  {celebrations > 0 && <Burst key={celebrations} />}
                </button>
              </span>
            </div>

            {files ? (
              <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                <FileTree
                  paths={[...files.keys()]}
                  current={activePath}
                  changed={generated.changed}
                  edited={edited}
                  generation={generation}
                  label={t("preview.tree")}
                  editedLabel={t("preview.edited")}
                  onSelect={setCurrent}
                />
                <CodeView
                  path={activePath}
                  code={files.get(activePath) ?? ""}
                  edited={edited.has(activePath)}
                  before={
                    generated.before && generated.changed.has(activePath)
                      ? (generated.before.get(activePath) ?? null)
                      : undefined
                  }
                  onEdit={(code) =>
                    setEdits((prev) => {
                      const next = new Map(prev);
                      // Editing back to the generated text is no edit at all.
                      if (code === generatedFiles?.get(activePath))
                        next.delete(activePath);
                      else next.set(activePath, code);
                      return next;
                    })
                  }
                  onReset={() =>
                    setEdits((prev) => {
                      const next = new Map(prev);
                      next.delete(activePath);
                      return next;
                    })
                  }
                />
              </div>
            ) : (
              <p className="m-0 h-[min(68vh,640px)] p-6 text-muted lg:h-[calc(100dvh-16.25rem)]">
                {t("preview.generating")}
              </p>
            )}

            {result?.ok && (
              <CommandBar
                command={createCommand({ ...selection, name: projectName })}
                hasEdits={edited.size > 0}
              />
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
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm text-muted">
          <span>{t("footer.tagline")}</span>
          <nav className="flex gap-4">
            <a className="hover:text-ink" href="/stacks/">
              {t("footer.templates")}
            </a>
            <a
              className="hover:text-ink"
              href="https://www.npmjs.com/package/create-pickstack"
            >
              npm
            </a>
            <a
              className="hover:text-ink"
              href="https://github.com/kamranheyderli/pickstack"
            >
              GitHub
            </a>
          </nav>
        </footer>
      </main>
    </LocaleProvider>
  );
}
