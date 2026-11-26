import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { GitHubMark } from "../lib/icons";

interface GitHubDialogProps {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onContinue: (repo: { name: string; private: boolean }) => void;
}

/** GitHub's rule for repository names: letters, digits, `.`, `-` and `_`. */
const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

/** Asks for the repository name and visibility before leaving for GitHub's consent screen. */
export function GitHubDialog({
  open,
  defaultName,
  onClose,
  onContinue,
}: GitHubDialogProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(defaultName);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName(defaultName);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, defaultName]);

  const valid = REPO_NAME.test(name) && name !== "." && name !== "..";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="github-dialog-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onContinue({ name, private: isPrivate });
        }}
      >
        <h2
          id="github-dialog-title"
          className="m-0 flex items-center gap-2 text-base font-semibold"
        >
          <GitHubMark size={18} />
          {t("github.title")}
        </h2>
        <p className="m-0 text-sm text-muted">{t("github.intro")}</p>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("github.name")}
          <input
            type="text"
            value={name}
            required
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!valid}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-sm outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-ring)] aria-invalid:border-red-500"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          {t("github.private")}
        </label>
        <p className="m-0 text-xs text-muted">{t("github.note")}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm font-semibold text-ink/85 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t("github.cancel")}
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GitHubMark />
            {t("github.continue")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
