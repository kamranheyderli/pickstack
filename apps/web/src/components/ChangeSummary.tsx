import { useT } from "../i18n";
import { UiIcon } from "../lib/icons";

interface ChangeSummaryProps {
  /** What the user just did, e.g. "Added Tailwind CSS". */
  title: string;
  added: string[];
  changed: string[];
  removed: number;
  onOpen: (path: string) => void;
  onClose: () => void;
}

/** Files shown as buttons; the rest are counted. */
const SHOWN = 4;

/**
 * Says what the last module pick did to the project: new, changed and removed files, each
 * new or changed file one click away from its diff.
 */
export function ChangeSummary({
  title,
  added,
  changed,
  removed,
  onOpen,
  onClose,
}: ChangeSummaryProps) {
  const t = useT();
  const files = [
    ...added.map((path) => ({ path, kind: "new" as const })),
    ...changed.map((path) => ({ path, kind: "changed" as const })),
  ];
  const counts = [
    added.length ? t("changes.new", { count: added.length }) : "",
    changed.length ? t("changes.changed", { count: changed.length }) : "",
    removed ? t("changes.removed", { count: removed }) : "",
  ].filter(Boolean);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-accent-soft px-4 py-2.5 text-sm"
    >
      <span className="font-semibold">{title}</span>
      <span className="text-muted">
        {counts.length ? counts.join(" · ") : t("changes.none")}
      </span>
      {files.length > 0 && (
        <ul className="m-0 flex min-w-0 list-none flex-wrap gap-1.5 p-0">
          {files.slice(0, SHOWN).map(({ path, kind }) => (
            <li key={path}>
              <button
                type="button"
                onClick={() => onOpen(path)}
                title={t("changes.open")}
                className="inline-flex max-w-[16rem] cursor-pointer items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-0.5 font-mono text-xs hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${kind === "new" ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                <span className="truncate">{path}</span>
                <span className="sr-only">
                  {kind === "new"
                    ? t("changes.newFile")
                    : t("changes.changedFile")}
                </span>
              </button>
            </li>
          ))}
          {files.length > SHOWN && (
            <li className="self-center text-xs text-muted">
              +{files.length - SHOWN}
            </li>
          )}
        </ul>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("github.close")}
        className="ml-auto cursor-pointer rounded-md p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <UiIcon name="close" size={14} />
      </button>
    </div>
  );
}
