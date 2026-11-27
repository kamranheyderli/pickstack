import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { UiIcon } from "../lib/icons";
import type { RunGuide } from "../lib/runSteps";

interface RunGuideDialogProps {
  guide: RunGuide | null;
  onClose: () => void;
}

/**
 * "How to run it": the terminal steps for the project just downloaded or created on GitHub,
 * each with a copy button, then the address the app opens at.
 */
export function RunGuideDialog({ guide, onClose }: RunGuideDialogProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (guide && !dialog.open) dialog.showModal();
    else if (!guide && dialog.open) dialog.close();
  }, [guide]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="run-guide-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-0 text-ink shadow-2xl outline-none backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {guide && (
        <div className="flex flex-col gap-4 p-5">
          <h2
            id="run-guide-title"
            className="m-0 flex items-center gap-2 text-base font-semibold"
          >
            <UiIcon name="terminal" />
            {t("run.title")}
          </h2>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {guide.steps.map((step, index) => (
              <li
                key={step.commands.join("\n")}
                className="flex flex-col gap-1.5"
              >
                <span className="text-sm font-medium">
                  <span className="mr-1.5 text-muted">{index + 1}.</span>
                  {t(step.label, step.vars)}
                </span>
                <CommandBlock lines={step.commands} />
              </li>
            ))}
          </ol>
          {guide.needsSecret && (
            <p className="m-0 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-muted">
              {t("run.secret")}{" "}
              <code className="font-mono text-xs text-ink">
                openssl rand -base64 32
              </code>
            </p>
          )}
          <p className="m-0 text-sm">
            {t("run.open")}{" "}
            <a
              href={guide.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono font-semibold text-accent underline underline-offset-2"
            >
              {guide.url}
            </a>
          </p>
          <p className="m-0 text-xs text-muted">{t("run.readme")}</p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("run.done")}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

function CommandBlock({ lines }: { lines: string[] }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const text = lines.join("\n");
  return (
    <div className="flex items-start gap-2 rounded-lg bg-code px-3 py-2">
      <pre className="m-0 min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-code-ink">
        {lines.map((line) => (
          <span key={line} className="block">
            <span className="text-emerald-400 select-none">$ </span>
            {line}
          </span>
        ))}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            setCopied(false);
          }
        }}
        aria-label={t("command.copy")}
        className="shrink-0 cursor-pointer rounded-md p-1 text-code-ink/60 hover:text-code-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <UiIcon name={copied ? "check" : "copy"} size={14} />
      </button>
    </div>
  );
}
