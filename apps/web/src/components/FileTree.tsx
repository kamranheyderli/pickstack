import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { UiIcon } from "../lib/icons";

interface FileTreeProps {
  paths: string[];
  current: string;
  changed: Set<string>;
  /** Files the user edited; marked so it's clear they no longer follow generation. */
  edited: Set<string>;
  /** Bumped on every generation so the "changed" flash animation restarts. */
  generation: number;
  label: string;
  editedLabel: string;
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
  scss: "#c6538c",
  html: "#e5532d",
  md: "#8b8b96",
  vue: "#41b883",
  svelte: "#ff3e00",
  astro: "#bc52ee",
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

interface DirNode {
  /** Directory path with a trailing slash; "" for the root. */
  path: string;
  files: string[];
  dirs: Map<string, DirNode>;
}

function buildTree(paths: string[]): DirNode {
  const root: DirNode = { path: "", files: [], dirs: new Map() };
  for (const path of sortPaths(paths)) {
    let node = root;
    for (const part of dirOf(path).split("/").filter(Boolean)) {
      let child = node.dirs.get(part);
      if (!child) {
        child = { path: `${node.path}${part}/`, files: [], dirs: new Map() };
        node.dirs.set(part, child);
      }
      node = child;
    }
    node.files.push(path);
  }
  return root;
}

/** Files in display order, skipping the contents of collapsed directories. */
function visibleFiles(node: DirNode, collapsed: Set<string>): string[] {
  return [
    ...node.files,
    ...[...node.dirs.values()].flatMap((dir) =>
      collapsed.has(dir.path) ? [] : visibleFiles(dir, collapsed),
    ),
  ];
}

export function FileTree({
  paths,
  current,
  changed,
  edited,
  generation,
  label,
  editedLabel,
  onSelect,
}: FileTreeProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const tree = buildTree(paths);

  const toggle = (dir: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const files = visibleFiles(tree, collapsed);
    const index = files.indexOf(current);
    const next = files[index + (e.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    onSelect(next);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-path="${CSS.escape(next)}"]`)
      ?.focus();
  };

  const indentFor = (depth: number) => ({
    paddingLeft: `${0.5 + depth * 0.85}rem`,
  });

  const renderFile = (path: string, depth: number) => {
    const isCurrent = path === current;
    return (
      <button
        key={path}
        type="button"
        data-path={path}
        aria-current={isCurrent ? "true" : undefined}
        tabIndex={isCurrent ? 0 : -1}
        onClick={() => onSelect(path)}
        style={indentFor(depth)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 text-left whitespace-nowrap text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent aria-[current=true]:bg-accent-soft aria-[current=true]:font-semibold aria-[current=true]:text-ink"
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
        {edited.has(path) && (
          <span
            className="ml-auto text-[0.65rem] font-semibold text-accent"
            title={editedLabel}
          >
            M<span className="sr-only"> ({editedLabel})</span>
          </span>
        )}
      </button>
    );
  };

  const renderDir = (dir: DirNode, depth: number): ReactNode => {
    const open = !collapsed.has(dir.path);
    const name = dir.path.split("/").filter(Boolean).at(-1);
    return (
      <div key={dir.path}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => toggle(dir.path)}
          style={indentFor(depth)}
          className="flex w-full cursor-pointer items-center gap-1 rounded-lg py-1 pr-2 text-left whitespace-nowrap text-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className={`inline-flex transition-transform motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
          >
            <UiIcon name="chevron" size={12} />
          </span>
          <UiIcon name="folder" size={13} />
          {name}
        </button>
        {open && renderNode(dir, depth + 1)}
      </div>
    );
  };

  const renderNode = (node: DirNode, depth: number): ReactNode => (
    <>
      {node.files.map((path) => renderFile(path, depth))}
      {[...node.dirs.values()].map((dir) => renderDir(dir, depth))}
    </>
  );

  return (
    <nav
      aria-label={label}
      className="max-h-64 overflow-auto border-b border-line bg-panel-2/60 p-2 font-mono text-[0.78rem] md:max-h-none md:border-r md:border-b-0"
    >
      <div ref={listRef} onKeyDown={onKeyDown}>
        {renderNode(tree, 0)}
      </div>
    </nav>
  );
}
