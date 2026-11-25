import {
  cliPackage,
  startCommand,
  type PackageManager,
} from "@stackforge/core";
import { useState } from "react";
import { useT } from "../i18n";
import { BrandIcon, packageManagerIcons, UiIcon } from "../lib/icons";

const managers: readonly PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

/**
 * "Start in the terminal": the bare create command for the chosen package manager, a copy
 * button and a link to the package on npm.
 */
export function QuickStart({ initial }: { initial: PackageManager }) {
  const t = useT();
  const [pm, setPm] = useState<PackageManager>(initial);
  const [copied, setCopied] = useState(false);
  const command = startCommand(pm);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-5 max-w-xl">
      <div
        role="tablist"
        aria-label={t("field.packageManager")}
        className="mb-2 flex gap-1"
      >
        {managers.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={m === pm}
            onClick={() => {
              setPm(m);
              setCopied(false);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent aria-selected:bg-panel-2 aria-selected:text-ink"
          >
            <BrandIcon icon={packageManagerIcons[m]} size={12} />
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-panel/80 py-1.5 pr-1.5 pl-4 shadow-xs backdrop-blur">
        <code className="min-w-0 flex-1 truncate font-mono text-sm">
          <span className="text-emerald-500 select-none">$ </span>
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-bg transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <UiIcon name={copied ? "check" : "copy"} size={13} />
          <span aria-live="polite">
            {copied ? t("command.copied") : t("command.copy")}
          </span>
        </button>
      </div>
      <p className="mt-2 mb-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {t("quickstart.hint")}
        <a
          href={`https://www.npmjs.com/package/${cliPackage}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-ink/80 underline-offset-2 hover:text-ink hover:underline"
        >
          <BrandIcon icon={packageManagerIcons.npm} size={12} />
          {cliPackage}
        </a>
      </p>
    </div>
  );
}
