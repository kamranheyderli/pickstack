import { useEffect, type ReactNode } from "react";
import { useT } from "../i18n";
import { UiIcon } from "../lib/icons";

interface ToastProps {
  children: ReactNode;
  onClose: () => void;
  /** An error stays until closed; a success closes on its own after `duration` milliseconds. */
  tone?: "success" | "error";
  duration?: number;
}

/** A short message in the bottom corner, closed with its × button (a success also on its own). */
export function Toast({
  children,
  onClose,
  tone = "success",
  duration = 8000,
}: ToastProps) {
  const t = useT();

  useEffect(() => {
    if (tone === "error") return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [onClose, tone, duration]);

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className="toast fixed right-4 bottom-4 left-4 z-50 flex items-start gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink shadow-2xl sm:left-auto sm:w-[min(24rem,calc(100vw-2rem))]"
    >
      <span
        className={`mt-0.5 ${tone === "error" ? "text-red-500" : "text-emerald-500"}`}
      >
        <UiIcon name={tone === "error" ? "close" : "check"} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("github.close")}
        className="-m-1 cursor-pointer rounded-md p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <UiIcon name="close" />
      </button>
    </div>
  );
}
