import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";

interface TerminalDemoProps {
  /** The `create` command for the current selection. */
  command: string;
  /** Lines printed after the command (the CLI's output). */
  output: string[];
}

const TYPE_MS = 18;
const LINE_MS = 260;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A terminal window that types the command once, then prints the output line by line. Later
 * selection changes update it in place, so it shows the current command without replaying.
 */
export function TerminalDemo({ command, output }: TerminalDemoProps) {
  const t = useT();
  const played = useRef(reducedMotion());
  const [typed, setTyped] = useState(played.current ? Infinity : 0);
  const [shown, setShown] = useState(played.current ? Infinity : 0);

  useEffect(() => {
    if (played.current) return;
    let chars = 0;
    let lines = 0;
    let timer: ReturnType<typeof setTimeout>;
    const typeNext = () => {
      chars += 1;
      setTyped(chars);
      if (chars < command.length) timer = setTimeout(typeNext, TYPE_MS);
      else timer = setTimeout(showNext, LINE_MS);
    };
    const showNext = () => {
      lines += 1;
      setShown(lines);
      if (lines < output.length) timer = setTimeout(showNext, LINE_MS);
      else played.current = true;
    };
    timer = setTimeout(typeNext, 400);
    return () => clearTimeout(timer);
    // Plays once, with the command of the first render.
  }, []);

  const typing = typed < command.length;
  return (
    <figure
      aria-label={t("terminal.label")}
      className="m-0 overflow-hidden rounded-2xl border border-white/10 bg-code shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)]"
    >
      <figcaption className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 font-mono text-[0.7rem] text-code-ink/50">
          zsh
        </span>
      </figcaption>
      <pre className="m-0 min-h-56 overflow-x-auto p-4 font-mono text-[0.78rem] leading-[1.75] whitespace-pre-wrap text-code-ink">
        <span className="text-emerald-400">$ </span>
        {command.slice(0, typed)}
        {typing && (
          <span
            aria-hidden="true"
            className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-pulse bg-code-ink/80"
          />
        )}
        {!typing &&
          output.slice(0, shown).map((line, index) => (
            <span
              key={index}
              className={`block ${line.startsWith("$") ? "mt-2" : "text-code-ink/70"}`}
            >
              {line.startsWith("$") ? (
                <>
                  <span className="text-emerald-400">$ </span>
                  {line.slice(2)}
                </>
              ) : (
                line
              )}
            </span>
          ))}
      </pre>
    </figure>
  );
}
