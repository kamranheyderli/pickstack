import sdk, { type VM } from "@stackblitz/sdk";
import { useEffect, useRef } from "react";
import { liveUpdate } from "../lib/liveUpdate";
import type { RunnableProject } from "../lib/stackblitz";

interface LivePreviewProps {
  name: string;
  project: RunnableProject;
  theme: "light" | "dark";
  title: string;
  /** False while it warms up behind the code view. */
  visible: boolean;
}

/** How long picks must settle before a hidden preview installs again. */
const SETTLE_MS = 4000;

/**
 * The project running in a StackBlitz WebContainer inside the page. Later selections reach it
 * as file changes, which the dev server hot-reloads; a changed package.json needs an install,
 * so the project is embedded again. While hidden (started early so it's ready when opened),
 * that waits until the picks settle instead of reinstalling on every click.
 */
export function LivePreview({
  name,
  project,
  theme,
  title,
  visible,
}: LivePreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const vm = useRef<Promise<VM | null> | null>(null);
  const shown = useRef<Record<string, string> | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ name, project, theme, title });
  latest.current = { name, project, theme, title };

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  useEffect(() => {
    const wrapper = host.current;
    if (!wrapper) return;
    const update = liveUpdate(shown.current, project.files);
    if (update.kind === "none") return;
    if (update.kind === "diff" && vm.current) {
      shown.current = project.files;
      vm.current = vm.current.then(async (machine) => {
        await machine?.applyFsDiff(update.diff);
        return machine;
      });
      return;
    }
    const embed = () => {
      pending.current = null;
      const current = latest.current;
      shown.current = current.project.files;
      // embedProject replaces the element it gets, so each embed gets a fresh one.
      const target = document.createElement("div");
      wrapper.replaceChildren(target);
      vm.current = sdk
        .embedProject(
          target,
          {
            title: current.name,
            description: "Created with pickstack",
            template: "node",
            files: current.project.files,
          },
          {
            view: "preview",
            hideNavigation: true,
            // WebContainers run only in a cross-origin isolated page (see vite.config.ts).
            crossOriginIsolated: true,
            theme: current.theme,
            height: "100%",
            openFile: current.project.openFile,
          },
        )
        .then((machine) => {
          wrapper.querySelector("iframe")?.setAttribute("title", current.title);
          return machine;
        })
        .catch(() => null);
    };
    if (pending.current) clearTimeout(pending.current);
    if (visible) embed();
    else pending.current = setTimeout(embed, SETTLE_MS);
  }, [project, visible]);

  return (
    <div
      ref={host}
      className="h-[min(68vh,640px)] bg-panel-2 lg:h-[calc(100dvh-16.25rem)] [&>iframe]:block [&>iframe]:size-full [&>iframe]:border-0"
    />
  );
}
