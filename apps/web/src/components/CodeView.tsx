import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "../i18n";
import { highlight } from "../lib/highlight";
import { UiIcon } from "../lib/icons";

interface CodeViewProps {
  path: string;
  code: string;
  /** The user changed this file; it no longer follows generation. */
  edited: boolean;
  onEdit: (code: string) => void;
  onReset: () => void;
}

const codeClass =
  "m-0 h-[min(68vh,640px)] lg:h-[calc(100dvh-13.5rem)] overflow-auto px-5 py-4 font-mono text-[0.8rem] leading-[1.7] text-code-ink [tab-size:2]";

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
}: CodeViewProps) {
  const t = useT();
  const [html, setHtml] = useState<{ code: string; html: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const underlay = useRef<HTMLDivElement>(null);

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
          {edited && (
            <button type="button" onClick={onReset} className={toolButton}>
              <UiIcon name="undo" size={13} />
              {t("preview.reset")}
            </button>
          )}
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => setEditing((on) => !on)}
            className={toolButton}
          >
            <UiIcon name={editing ? "eye" : "pencil"} size={13} />
            {editing ? t("preview.view") : t("preview.edit")}
          </button>
        </span>
      </div>
      {editing ? (
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
            onKeyDown={(e) => onEditorKeyDown(e, onEdit)}
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
