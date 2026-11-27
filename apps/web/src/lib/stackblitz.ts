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

/**
 * Dev-only tools the dev server never loads: linters, formatters, test runners, git hooks,
 * Storybook and type checkers that run as separate commands. Leaving them out of the live
 * preview's install makes it start much sooner.
 */
const notForDev =
  /^(eslint|eslint-.+|@eslint\/.+|typescript-eslint|@typescript-eslint\/.+|globals|prettier|prettier-.+|@biomejs\/.+|vitest|@vitest\/.+|@testing-library\/.+|jsdom|happy-dom|@playwright\/.+|playwright|husky|lint-staged|storybook|@storybook\/.+|@chromatic-com\/.+|svelte-check|vue-tsc|@angular-eslint\/.+|angular-eslint)$/;

/** Config files the dev server loads. */
const devConfig =
  /(^|\/)(vite|astro|nuxt|svelte|next|postcss|tailwind)\.config\.[cm]?[jt]s$/;

/**
 * The project as the live preview installs it: every package.json without the tools above
 * and without the `prepare` script (Husky's git hook setup has no repository to work on).
 * The ZIP, GitHub and "Run in browser" keep the full project.
 */
export function forLivePreview(project: RunnableProject): RunnableProject {
  // A package a dev-time config imports stays (SvelteKit's vite.config takes defineConfig
  // from vitest/config when Vitest is picked).
  const imported = new Set<string>();
  for (const [path, content] of Object.entries(project.files))
    if (devConfig.test(path))
      for (const m of content.matchAll(/from\s+["']((?:@[^/"']+\/)?[^/"']+)/g))
        if (m[1]) imported.add(m[1]);
  const files = Object.fromEntries(
    Object.entries(project.files).map(([path, content]) => {
      if (path.split("/").at(-1) !== "package.json") return [path, content];
      const pkg = JSON.parse(content) as {
        scripts?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      if (pkg.devDependencies)
        pkg.devDependencies = Object.fromEntries(
          Object.entries(pkg.devDependencies).filter(
            ([name]) => imported.has(name) || !notForDev.test(name),
          ),
        );
      if (pkg.scripts) delete pkg.scripts.prepare;
      return [path, `${JSON.stringify(pkg, null, 2)}\n`];
    }),
  );
  return { ...project, files };
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
