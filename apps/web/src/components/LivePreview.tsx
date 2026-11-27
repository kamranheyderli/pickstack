import sdk, { type VM } from "@stackblitz/sdk";
import { useEffect, useRef } from "react";
import { liveUpdate } from "../lib/liveUpdate";
import type { RunnableProject } from "../lib/stackblitz";

interface LivePreviewProps {
  name: string;
  project: RunnableProject;
  theme: "light" | "dark";
  title: string;
}

/**
 * The project running in a StackBlitz WebContainer inside the page. Later selections reach it
 * as file changes, which the dev server hot-reloads; a changed package.json needs an install,
 * so the project is embedded again.
 */
export function LivePreview({ name, project, theme, title }: LivePreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const vm = useRef<Promise<VM | null> | null>(null);
  const shown = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    const wrapper = host.current;
    if (!wrapper) return;
    const update = liveUpdate(shown.current, project.files);
    if (update.kind === "none") return;
    shown.current = project.files;
    if (update.kind === "diff" && vm.current) {
      const pending = vm.current;
      vm.current = pending.then(async (machine) => {
        await machine?.applyFsDiff(update.diff);
        return machine;
      });
      return;
    }
    // embedProject replaces the element it gets, so each embed gets a fresh one.
    const target = document.createElement("div");
    wrapper.replaceChildren(target);
    vm.current = sdk
      .embedProject(
        target,
        {
          title: name,
          description: "Created with pickstack",
          template: "node",
          files: project.files,
        },
        {
          view: "preview",
          hideNavigation: true,
          // WebContainers run only in a cross-origin isolated page (see vite.config.ts).
          crossOriginIsolated: true,
          theme,
          height: "100%",
          openFile: project.openFile,
        },
      )
      .then((machine) => {
        const frame = wrapper.querySelector("iframe");
        frame?.setAttribute("title", title);
        return machine;
      })
      .catch(() => null);
  }, [name, project, theme, title]);

  return (
    <div
      ref={host}
      className="h-[min(68vh,640px)] bg-panel-2 lg:h-[calc(100dvh-16.25rem)] [&>iframe]:block [&>iframe]:size-full [&>iframe]:border-0"
    />
  );
}
