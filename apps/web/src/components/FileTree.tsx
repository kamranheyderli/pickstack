import { useRef, type KeyboardEvent } from "react";
import { UiIcon } from "../lib/icons";

interface FileTreeProps {
  paths: string[];
  current: string;
  changed: Set<string>;
  /** Bumped on every generation so the "changed" flash animation restarts. */
  generation: number;
  label: string;
  onSelect: (path: string) => void;
}

const dirOf = (p: string) =>
  p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "";
const baseOf = (p: string) => p.slice(p.lastIndexOf("/") + 1);

const extColors: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#d4b830",
  jsx: "#d4b830",
  json: "#e8a33d",
  css: "#2fa7d8",
  html: "#e5532d",
  md: "#8b8b96",
};

function extColor(path: string): string {
  const name = baseOf(path);
  const dot = name.lastIndexOf(".");
  return (dot > 0 && extColors[name.slice(dot + 1)]) || "#8b8b96";
}

/** Root files first, then directories alphabetically, files sorted within each directory. */
export function sortPaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const da = dirOf(a);
    const db = dirOf(b);
    if (da === db) return a.localeCompare(b);
    if (!da) return -1;
    if (!db) return 1;
    return da.localeCompare(db);
  });
}

export function FileTree({
  paths,
  current,
  changed,
  generation,
  label,
  onSelect,
}: FileTreeProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const sorted = sortPaths(paths);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const index = sorted.indexOf(current);
    const next = sorted[index + (e.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    onSelect(next);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-path="${CSS.escape(next)}"]`)
      ?.focus();
  };

  let lastDir = "";
  return (
    <nav
      aria-label={label}
      className="max-h-64 overflow-auto border-b border-line bg-panel-2/60 p-2 font-mono text-[0.78rem] md:max-h-none md:border-r md:border-b-0"
    >
      <div ref={listRef} onKeyDown={onKeyDown}>
        {sorted.map((path) => {
          const dir = dirOf(path);
          const depth = dir ? dir.split("/").filter(Boolean).length : 0;
          const header = dir && dir !== lastDir;
          lastDir = dir;
          const isCurrent = path === current;
          return (
            <div key={path}>
              {header && (
                <div
                  className="flex items-center gap-1.5 px-2 pt-2.5 pb-1 text-muted"
                  style={{ paddingLeft: `${0.5 + (depth - 1) * 0.85}rem` }}
                >
                  <UiIcon name="folder" size={13} />
                  {dir.split("/").filter(Boolean).at(-1)}
                </div>
              )}
              <button
                type="button"
                data-path={path}
                aria-current={isCurrent ? "true" : undefined}
                tabIndex={isCurrent ? 0 : -1}
                onClick={() => onSelect(path)}
                style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 text-left whitespace-nowrap text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent aria-[current=true]:bg-accent-soft aria-[current=true]:font-semibold aria-[current=true]:text-ink"
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: extColor(path) }}
                />
                {/* Keyed span restarts the flash without remounting the focusable button. */}
                <span
                  key={changed.has(path) ? generation : "static"}
                  className={`-mx-1 rounded px-1 ${changed.has(path) ? "animate-flash" : ""}`}
                >
                  {baseOf(path)}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
