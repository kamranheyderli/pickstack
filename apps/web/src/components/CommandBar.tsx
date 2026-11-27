import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { UiIcon } from "../lib/icons";

interface CommandBarProps {
  /** The terminal command that creates the same project. */
  command: string;
  /** The preview has hand edits, which the command can't carry. */
  hasEdits: boolean;
  /** Called after the command reached the clipboard. */
  onCopy?: () => void;
}

export function CommandBar({ command, hasEdits, onCopy }: CommandBarProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  // A new selection gives a new command; the "copied" tick belongs to the old one.
  useEffect(() => setCopied(false), [command]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      onCopy?.();
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the command stays selectable.
      setCopied(false);
    }
  };

  return (
    <div className="border-t border-line px-4 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <UiIcon name="terminal" size={13} />
          {t("command.label")}
        </span>
        {hasEdits && <span>{t("command.edits")}</span>}
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-code py-1.5 pr-1.5 pl-3">
        <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.78rem] whitespace-nowrap text-code-ink select-all">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-code-ink/80 transition hover:bg-white/10 hover:text-code-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <UiIcon name={copied ? "check" : "copy"} size={13} />
          <span aria-live="polite">
            {copied ? t("command.copied") : t("command.copy")}
          </span>
        </button>
      </div>
    </div>
  );
}
