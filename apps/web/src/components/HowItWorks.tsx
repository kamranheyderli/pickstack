import type { ReactNode } from "react";
import { useT } from "../i18n";
import { GitHubMark, UiIcon } from "../lib/icons";

interface HowItWorksProps {
  /** The create command for the current selection, shown in the second card. */
  command: string;
  /** Scrolls to the framework picker, where choosing starts. */
  onStart: () => void;
}

/**
 * Three ways to the same project, in plain words: the interactive CLI, the site's picks as one
 * command, or straight from the site (ZIP, GitHub, StackBlitz) without a terminal.
 */
export function HowItWorks({ command, onStart }: HowItWorksProps) {
  const t = useT();
  return (
    <section aria-labelledby="ways-heading" className="mb-8">
      <h2 id="ways-heading" className="mt-0 mb-1 text-sm font-semibold">
        {t("ways.title")}
      </h2>
      <p className="mt-0 mb-3 text-sm text-muted">{t("ways.intro")}</p>
      <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
        <Way
          step={1}
          icon={<UiIcon name="terminal" />}
          title={t("ways.cli.title")}
          badge={t("ways.cli.badge")}
          body={t("ways.cli.body")}
        >
          <code className="block truncate rounded-lg border border-white/10 bg-code px-3 py-2 font-mono text-xs text-code-ink">
            <span className="text-emerald-400 select-none">$ </span>
            npm create pickstack@latest
          </code>
        </Way>
        <Way
          step={2}
          icon={<UiIcon name="copy" />}
          title={t("ways.command.title")}
          body={t("ways.command.body")}
        >
          <code
            className="block truncate rounded-lg border border-white/10 bg-code px-3 py-2 font-mono text-xs text-code-ink"
            title={command}
          >
            <span className="text-emerald-400 select-none">$ </span>
            {command}
          </code>
        </Way>
        <Way
          step={3}
          icon={<UiIcon name="download" />}
          title={t("ways.site.title")}
          body={t("ways.site.body")}
        >
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs font-medium">
            <li className="inline-flex items-center gap-1 rounded-md border border-line bg-panel-2 px-2 py-1">
              <UiIcon name="download" size={12} />
              {t("ways.site.zip")}
            </li>
            <li className="inline-flex items-center gap-1 rounded-md border border-line bg-panel-2 px-2 py-1">
              <GitHubMark size={12} />
              GitHub
            </li>
            <li className="inline-flex items-center gap-1 rounded-md border border-line bg-panel-2 px-2 py-1">
              <UiIcon name="play" size={12} />
              {t("ways.site.run")}
            </li>
          </ul>
        </Way>
      </ol>
      <button
        type="button"
        onClick={onStart}
        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
      >
        {t("ways.start")}
        <span aria-hidden="true">↓</span>
      </button>
    </section>
  );
}

function Way({
  step,
  icon,
  title,
  badge,
  body,
  children,
}: {
  step: number;
  icon: ReactNode;
  title: string;
  badge?: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <h3 className="m-0 text-sm font-semibold">
          <span className="mr-1 text-muted">{step}.</span>
          {title}
        </h3>
        {badge && (
          <span className="ml-auto rounded-full bg-success-soft px-2 py-0.5 text-[0.65rem] font-semibold text-success">
            {badge}
          </span>
        )}
      </div>
      <p className="m-0 flex-1 text-sm text-muted">{body}</p>
      {children}
    </li>
  );
}
