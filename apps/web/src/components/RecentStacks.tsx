import { getFramework, getModule } from "@stackforge/core";
import { useT } from "../i18n";
import { BrandIcon, frameworkIcons } from "../lib/icons";

interface RecentStacksProps {
  /** Recent stacks as share-link query strings, newest first. */
  queries: string[];
  /** The current selection's query, to mark it. */
  current: string;
  onPick: (query: string) => void;
}

/** Modules named on a chip; the rest are counted. */
const NAMED = 2;

/** "Your recent stacks": the stacks this browser took, one click away. Hidden when empty. */
export function RecentStacks({ queries, current, onPick }: RecentStacksProps) {
  const t = useT();
  const stacks = queries
    .map((query) => {
      const params = new URLSearchParams(query);
      const framework = getFramework(params.get("f") ?? "");
      if (!framework) return null;
      const modules = (params.get("m") ?? "").split(",").filter(Boolean);
      const names = modules
        .slice(0, NAMED)
        .map((id) => getModule(id)?.name ?? id);
      const more = modules.length - names.length;
      return {
        query,
        framework,
        label:
          [framework.name, ...names].join(" + ") +
          (more > 0 ? ` +${more}` : ""),
      };
    })
    .filter((stack) => stack !== null);
  if (!stacks.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted">
        {t("recent.title")}
      </span>
      {stacks.map(({ query, framework, label }) => (
        <button
          key={query}
          type="button"
          onClick={() => onPick(query)}
          aria-current={query === current ? "true" : undefined}
          className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-medium text-ink/85 hover:border-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-accent aria-[current=true]:border-accent aria-[current=true]:bg-accent-soft"
        >
          <BrandIcon icon={frameworkIcons[framework.id]} size={13} />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  );
}
