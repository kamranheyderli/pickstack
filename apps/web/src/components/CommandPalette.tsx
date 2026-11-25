import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useT } from "../i18n";
import { UiIcon } from "../lib/icons";

export interface PaletteCommand {
  id: string;
  group: string;
  label: string;
  icon?: ReactNode;
  /** Extra words to match, e.g. a module's category. */
  keywords?: string;
  checked?: boolean;
  /** Why the command can't run now; shown instead of running it. */
  disabledReason?: string;
  /** Leave the palette open after running (toggling several modules in a row). */
  keepOpen?: boolean;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

const matches = (command: PaletteCommand, query: string) => {
  const haystack =
    `${command.label} ${command.group} ${command.keywords ?? ""}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

/** A ⌘K palette: type to filter, arrows to move, Enter to run, Esc to close. */
export function CommandPalette({
  open,
  onClose,
  commands,
}: CommandPaletteProps) {
  const t = useT();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      setQuery("");
      setActive(0);
      node.showModal();
    } else if (!open && node.open) node.close();
  }, [open]);

  // Label matches before matches that only hit the group or keywords; order is kept otherwise.
  const labelHit = (c: PaletteCommand) =>
    query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((word) => c.label.toLowerCase().includes(word));
  const visible = commands
    .filter((c) => matches(c, query))
    .sort((a, b) => Number(labelHit(b)) - Number(labelHit(a)));
  const current = Math.min(active, Math.max(visible.length - 1, 0));

  useEffect(() => {
    list.current
      ?.querySelector(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const runCommand = (command: PaletteCommand | undefined) => {
    if (!command || command.disabledReason) return;
    command.run();
    if (!command.keepOpen) onClose();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(
        (current + step + visible.length) % Math.max(visible.length, 1),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCommand(visible[current]);
    }
  };

  let lastGroup = "";
  return (
    <dialog
      ref={dialog}
      aria-label={t("palette.label")}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-panel p-0 text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.5)] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 border-b border-line px-4">
        <span className="text-muted" aria-hidden="true">
          <UiIcon name="search" size={16} />
        </span>
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={
            visible.length ? `${id}-${current}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("palette.placeholder")}
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <kbd className="rounded border border-line px-1.5 font-mono text-[0.65rem] text-muted">
          Esc
        </kbd>
      </div>
      <ul
        ref={list}
        id={`${id}-list`}
        role="listbox"
        aria-label={t("palette.label")}
        className="m-0 max-h-[50vh] list-none overflow-y-auto p-2"
      >
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">
            {t("palette.empty")}
          </li>
        )}
        {visible.map((command, index) => {
          const heading = command.group !== lastGroup;
          lastGroup = command.group;
          return (
            <li key={command.id} role="presentation">
              {heading && (
                <p
                  role="presentation"
                  className="m-0 px-3 pt-2 pb-1 text-[0.65rem] font-medium tracking-wider text-muted uppercase"
                >
                  {command.group}
                </p>
              )}
              <div
                id={`${id}-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === current}
                aria-disabled={command.disabledReason ? true : undefined}
                title={command.disabledReason}
                onMouseMove={() => setActive(index)}
                onClick={() => runCommand(command)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-selected:bg-accent-soft"
              >
                <span className="grid size-5 shrink-0 place-items-center">
                  {command.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                {command.disabledReason && (
                  <span className="text-muted" aria-hidden="true">
                    <UiIcon name="lock" size={12} />
                  </span>
                )}
                {command.checked && (
                  <span className="text-accent">
                    <UiIcon name="check" size={14} />
                    <span className="sr-only">{t("palette.selected")}</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
