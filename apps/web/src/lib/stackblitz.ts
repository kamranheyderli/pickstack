import sdk from "@stackblitz/sdk";

export interface RunnableProject {
  /** Paths from the project's root, as StackBlitz takes them. */
  files: Record<string, string>;
  /** The folder that was opened when the project has no root package.json (e.g. "web"). */
  folder: string | null;
  openFile: string;
}

/**
 * What StackBlitz can run: the whole project when it has a root package.json, otherwise the
 * app's own folder (`web/` next to `server/`, or the first project of several). StackBlitz
 * installs with npm and runs the `dev` script, which every generated project has.
 */
export function runnableProject(
  files: ReadonlyMap<string, string>,
  activePath: string,
): RunnableProject {
  if (files.has("package.json"))
    return {
      files: Object.fromEntries(files),
      folder: null,
      openFile: files.has(activePath) ? activePath : "package.json",
    };
  const folders = [...files.keys()]
    .filter((path) => /^[^/]+\/package\.json$/.test(path))
    .map((path) => path.slice(0, path.indexOf("/")))
    .sort();
  const folder = folders.includes("web") ? "web" : (folders[0] ?? "");
  const prefix = `${folder}/`;
  const inside = [...files].filter(([path]) => path.startsWith(prefix));
  return {
    files: Object.fromEntries(
      inside.map(([path, content]) => [path.slice(prefix.length), content]),
    ),
    folder,
    openFile: activePath.startsWith(prefix)
      ? activePath.slice(prefix.length)
      : "package.json",
  };
}

/** Opens the project in a new StackBlitz tab; call it straight from a click (pop-up blockers). */
export function openInStackBlitz(name: string, project: RunnableProject): void {
  void sdk.openProject(
    {
      title: name,
      description: "Created with pickstack",
      template: "node",
      files: project.files,
    },
    { newWindow: true, openFile: project.openFile },
  );
}
