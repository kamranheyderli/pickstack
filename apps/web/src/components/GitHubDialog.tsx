import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { GitHubMark, UiIcon } from "../lib/icons";

/** Where the "Create on GitHub" flow is: asking, working, or done. */
export type GitHubStep =
  | { step: "form"; error?: string }
  | { step: "busy"; text: string }
  | { step: "done"; name: string; url: string };

interface GitHubDialogProps {
  open: boolean;
  state: GitHubStep;
  defaultName: string;
  defaultPrivate: boolean;
  onClose: () => void;
  onContinue: (repo: { name: string; private: boolean }) => void;
}

/** GitHub's rule for repository names: letters, digits, `.`, `-` and `_`. */
const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

const secondaryButton =
  "cursor-pointer rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm font-semibold text-ink/85 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const primaryButton =
  "inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The whole "Create on GitHub" flow: the repository name and visibility, a spinner while it is
 * being created, then the result. It cannot be dismissed while the repository is being created.
 */
export function GitHubDialog({
  open,
  state,
  defaultName,
  defaultPrivate,
  onClose,
  onContinue,
}: GitHubDialogProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(defaultName);
  const [isPrivate, setIsPrivate] = useState(defaultPrivate);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName(defaultName);
      setIsPrivate(defaultPrivate);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, defaultName, defaultPrivate]);

  const valid = REPO_NAME.test(name) && name !== "." && name !== "..";
  const busy = state.step === "busy";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      aria-labelledby="github-dialog-title"
      aria-busy={busy}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl outline-none border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 p-5">
        <h2
          id="github-dialog-title"
          className="m-0 flex items-center gap-2 text-base font-semibold"
        >
          <GitHubMark size={18} />
          {t("github.title")}
        </h2>

        {state.step === "busy" && (
          <div
            role="status"
            className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted"
          >
            <span
              aria-hidden="true"
              className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent"
            />
            {state.text}
          </div>
        )}

        {state.step === "done" && (
          <>
            <div
              role="status"
              className="flex flex-col items-center gap-3 py-4 text-center"
            >
              <span className="grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <UiIcon name="check" size={22} />
              </span>
              <p className="m-0 text-sm font-semibold">
                {t("github.done", { name: state.name })}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className={secondaryButton}
              >
                {t("github.close")}
              </button>
              <a
                href={state.url}
                target="_blank"
                rel="noreferrer"
                className={`${primaryButton} no-underline`}
              >
                <GitHubMark />
                {t("github.open")}
              </a>
            </div>
          </>
        )}

        {state.step === "form" && (
          <form
            method="dialog"
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) onContinue({ name, private: isPrivate });
            }}
          >
            <p className="m-0 text-sm text-muted">{t("github.intro")}</p>
            {state.error && (
              <p
                role="alert"
                className="m-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
              >
                {state.error}
              </p>
            )}
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
                className={secondaryButton}
              >
                {t("github.cancel")}
              </button>
              <button type="submit" disabled={!valid} className={primaryButton}>
                <GitHubMark />
                {t("github.continue")}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
