import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useT } from "../i18n";
import { diffStats, lineDiff } from "../lib/diff";
import { highlight } from "../lib/highlight";
import { UiIcon } from "../lib/icons";

interface CodeViewProps {
  path: string;
  code: string;
  /** The user changed this file; it no longer follows generation. */
  edited: boolean;
  onEdit: (code: string) => void;
  onReset: () => void;
  /**
   * The file before the latest selection change: its old text, `null` when the change added
   * it, `undefined` when the change left it alone.
   */
  before?: string | null;
  /** Bumped to switch to the diff, e.g. when a changed file is opened from the summary. */
  diffSignal?: number;
}

const codeClass =
  "m-0 h-[min(68vh,640px)] lg:h-[calc(100dvh-18.75rem)] overflow-auto px-5 py-4 font-mono text-[0.8rem] leading-[1.7] text-code-ink [tab-size:2]";

const toolButton =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-code-ink/80 transition hover:bg-white/10 hover:text-code-ink focus-visible:outline-2 focus-visible:outline-accent";

/** Tab indents with two spaces instead of leaving the editor. */
function onEditorKeyDown(
  e: KeyboardEvent<HTMLTextAreaElement>,
  onEdit: (code: string) => void,
) {
  if (e.key !== "Tab" || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey)
    return;
  e.preventDefault();
  const area = e.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = area;
  onEdit(`${value.slice(0, start)}  ${value.slice(end)}`);
  requestAnimationFrame(() => {
    area.selectionStart = area.selectionEnd = start + 2;
  });
}

export function CodeView({
  path,
  code,
  edited,
  onEdit,
  onReset,
  before,
  diffSignal = 0,
}: CodeViewProps) {
  const t = useT();

  const [html, setHtml] = useState<{ code: string; html: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const underlay = useRef<HTMLDivElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const finishing = useRef(false);
  const [showDiff, setShowDiff] = useState(false);
  useEffect(() => {
    if (diffSignal) setShowDiff(true);
  }, [diffSignal]);
  const diff = useMemo(
    () =>
      before === undefined || before === code
        ? null
        : lineDiff(before ?? "", code),
    [before, code],
  );
  const stats = diff ? diffStats(diff) : null;
  const diffing = showDiff && diff !== null && !editing;

  /** Leaves the editor and puts focus back on "Edit", so keyboard users aren't lost. */
  const finish = () => {
    finishing.current = true;
    setEditing(false);
  };
  useEffect(() => {
    if (!editing && finishing.current) {
      finishing.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  // Highlighting runs while editing too: the editor is a transparent textarea over it.
  useEffect(() => {
    let cancelled = false;
    highlight(code, path)
      .then((result) => {
        if (!cancelled)
          setHtml(result === null ? null : { code, html: result });
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, path]);

  const lines = code.split("\n").length - (code.endsWith("\n") ? 1 : 0);
  const highlighted = html && html.code === code ? html.html : null;

  return (
    <div className="flex min-w-0 flex-col bg-code">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-1.5 font-mono text-xs text-code-ink/70">
        <span className="flex min-w-0 items-center gap-2">
          <UiIcon name="file" size={13} />
          <strong className="truncate font-medium text-code-ink">{path}</strong>
          {edited && (
            <span className="shrink-0 rounded bg-accent/25 px-1.5 py-px text-[0.65rem] font-semibold text-code-ink">
              {t("preview.edited")}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="mr-1 hidden sm:inline">
            {t("preview.lines", { count: lines })}
          </span>
          {stats && !editing && (
            <button
              type="button"
              aria-pressed={diffing}
              onClick={() => setShowDiff((v) => !v)}
              title={t("preview.diffHint")}
              className={`${toolButton} aria-pressed:bg-white/10 aria-pressed:text-code-ink`}
            >
              <span className="text-emerald-400">+{stats.added}</span>
              <span className="text-red-400">−{stats.removed}</span>
              {diffing ? t("preview.code") : t("preview.diff")}
            </button>
          )}
          {edited && (
            <button type="button" onClick={onReset} className={toolButton}>
              <UiIcon name="undo" size={13} />
              {t("preview.reset")}
            </button>
          )}
          {editing ? (
            <button
              type="button"
              onClick={finish}
              title={t("preview.doneHint")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 font-semibold text-accent-ink transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <UiIcon name="check" size={13} />
              {t("preview.done")}
            </button>
          ) : (
            <button
              ref={editButton}
              type="button"
              onClick={() => setEditing(true)}
              className={toolButton}
            >
              <UiIcon name="pencil" size={13} />
              {t("preview.edit")}
            </button>
          )}
        </span>
      </div>
      {diffing && diff ? (
        <pre
          className={`${codeClass} whitespace-pre`}
          aria-label={t("preview.diff")}
        >
          {before === null && (
            <span className="mb-2 block text-xs text-emerald-400">
              {t("preview.newFile")}
            </span>
          )}
          {diff.map((line, index) =>
            line.type === "skip" ? (
              <span
                key={index}
                className="my-1 block rounded bg-white/5 px-2 text-xs text-code-ink/50"
              >
                ⋯ {t("preview.unchanged", { count: line.count })}
              </span>
            ) : (
              <span
                key={index}
                className={`-mx-5 block px-5 ${
                  line.type === "add"
                    ? "bg-emerald-500/15"
                    : line.type === "del"
                      ? "bg-red-500/15 text-code-ink/60 line-through decoration-red-400/40"
                      : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mr-3 inline-block w-3 select-none ${
                    line.type === "add"
                      ? "text-emerald-400"
                      : line.type === "del"
                        ? "text-red-400"
                        : "text-code-ink/30"
                  }`}
                >
                  {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
                </span>
                {line.text || " "}
              </span>
            ),
          )}
        </pre>
      ) : editing ? (
        // The textarea's text is transparent; the highlighted copy underneath shows through
        // and scrolls with it, so colours stay while typing.
        <div className="relative">
          <div
            ref={underlay}
            aria-hidden="true"
            className={`code-html ${codeClass} pointer-events-none overflow-hidden`}
          >
            {highlighted ? (
              <div dangerouslySetInnerHTML={{ __html: highlighted }} />
            ) : (
              <pre>{code}</pre>
            )}
          </div>
          <textarea
            aria-label={t("preview.editor", { path })}
            value={code}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            onChange={(e) => onEdit(e.target.value)}
            onKeyDown={(e) => {
              // Esc or Ctrl/⌘+Enter finishes editing.
              if (
                e.key === "Escape" ||
                (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              ) {
                e.preventDefault();
                finish();
                return;
              }
              onEditorKeyDown(e, onEdit);
            }}
            onScroll={(e) => {
              const box = underlay.current;
              if (!box) return;
              box.scrollTop = e.currentTarget.scrollTop;
              box.scrollLeft = e.currentTarget.scrollLeft;
            }}
            className={`${codeClass} absolute inset-0 w-full resize-none border-0 bg-transparent whitespace-pre text-transparent caret-code-ink outline-none selection:bg-white/20`}
          />
        </div>
      ) : highlighted ? (
        <div
          className={`code-html ${codeClass}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre className={codeClass}>{code}</pre>
      )}
    </div>
  );
}
