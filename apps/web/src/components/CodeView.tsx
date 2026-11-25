import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { highlight } from "../lib/highlight";
import { UiIcon } from "../lib/icons";

interface CodeViewProps {
  path: string;
  code: string;
}

export function CodeView({ path, code }: CodeViewProps) {
  const t = useT();
  const [html, setHtml] = useState<{ code: string; html: string } | null>(null);

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
  const codeClass =
    "m-0 h-[min(68vh,640px)] lg:h-[calc(100dvh-13.5rem)] overflow-auto px-5 py-4 font-mono text-[0.8rem] leading-[1.7] text-code-ink [tab-size:2]";

  return (
    <div className="flex min-w-0 flex-col bg-code">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5 font-mono text-xs text-code-ink/70">
        <span className="flex min-w-0 items-center gap-2">
          <UiIcon name="file" size={13} />
          <strong className="truncate font-medium text-code-ink">{path}</strong>
        </span>
        <span className="shrink-0">{t("preview.lines", { count: lines })}</span>
      </div>
      {html && html.code === code ? (
        <div
          className={`code-html ${codeClass}`}
          dangerouslySetInnerHTML={{ __html: html.html }}
        />
      ) : (
        <pre className={codeClass}>{code}</pre>
      )}
    </div>
  );
}
