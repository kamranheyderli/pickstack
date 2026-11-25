import { file } from "../../engine/code";
import { installCommand, runCommand } from "../../engine/finalize";
import type { Ctx, FrameworkId, ProjectModel } from "../../types";

/**
 * The project guide behind every AI agent file. AGENTS.md is the single source of truth
 * (Codex, Cursor, Copilot and Claude Code all read it); tool-specific files add only what is
 * specific to that tool. Everything is derived from the selection, so it describes this
 * project rather than generic advice.
 */

/** Scripts that publish the project somewhere; an agent asks before running them. */
export const OUTWARD_SCRIPTS: ReadonlySet<string> = new Set(["deploy"]);

/** Scripts that start long-running servers or run on install; agents shouldn't need them. */
const SERVER_SCRIPTS = new Set([
  "dev",
  "preview",
  "start",
  "watch",
  "prepare",
  "postinstall",
]);

const SCRIPT_PURPOSE: Record<string, string> = {
  dev: "start the dev server",
  build: "production build",
  preview: "serve the production build",
  start: "serve the production build",
  typecheck: "type-check",
  lint: "lint",
  format: "format all files",
  "format:check": "check formatting",
  check: "lint, format and import-order check (Biome)",
  test: "run the tests once",
  deploy: "build and publish the site (ask first)",
};

/** Framework layout and rules, with `x` the component extension and `s` the script one. */
function frameworkNotes(
  framework: FrameworkId,
  ctx: Ctx,
): { structure: string[]; rules: string[] } {
  const x = ctx.ext.component;
  const s = ctx.ext.script;
  switch (framework) {
    case "react":
      return {
        structure: [
          `\`src/main.${x}\` mounts the app; \`src/App.${x}\` is the root component.`,
          "Components live in `src/components/`, pages (with a router) in `src/pages/`.",
        ],
        rules: ["Function components and hooks only; no class components."],
      };
    case "preact":
      return {
        structure: [
          `\`src/main.${x}\` renders the app; components live in \`src/components/\`.`,
        ],
        rules: ["Use `preact/hooks`; JSX uses `class`, not `className`."],
      };
    case "solid":
      return {
        structure: [
          `\`src/index.${x}\` renders the app; components live in \`src/components/\`.`,
        ],
        rules: [
          "Components run once: read signals by calling them (`count()`), don't destructure props.",
          "JSX uses `class`, not `className`.",
        ],
      };
    case "vue":
      return {
        structure: [
          `\`src/main.${s}\` creates the app; \`src/App.vue\` is the root component.`,
          "Components live in `src/components/`, routed views in `src/views/`; `@/` points to `src/`.",
        ],
        rules: [
          `Single-file components with \`<script setup${ctx.isTs ? ' lang="ts"' : ""}>\` and the Composition API.`,
        ],
      };
    case "nuxt":
      return {
        structure: [
          "Source is in `app/`: pages in `app/pages/` (file-based routes), components in `app/components/`.",
          "`nuxt.config` holds modules and runtime config.",
        ],
        rules: [
          "Components, composables and Vue APIs are auto-imported; don't add imports for them.",
          "Use `<script setup>` and `useFetch`/`useAsyncData` for data loading.",
        ],
      };
    case "svelte":
      return {
        structure: [
          `\`src/main.${s}\` mounts \`src/App.svelte\`; components live in \`src/lib/\`.`,
        ],
        rules: [
          "Svelte 5 runes (`$state`, `$derived`, `$props`), not Svelte 4 stores or `export let`.",
        ],
      };
    case "sveltekit":
      return {
        structure: [
          "Routes are files in `src/routes/` (`+page.svelte`, `+layout.svelte`); shared code in `src/lib/`.",
          "Import from `src/lib` with the `#lib` alias (package.json `imports`).",
        ],
        rules: [
          "Svelte 5 runes (`$state`, `$derived`, `$props`).",
          "Pages are prerendered with adapter-static; keep routes static or change the adapter.",
        ],
      };
    case "next":
      return {
        structure: [
          "App Router: routes are folders in `app/` with `page` and `layout` files; components in `components/`.",
          "`@/` points to the project root.",
        ],
        rules: [
          'Components are Server Components by default; add `"use client"` only where state, effects or event handlers are needed.',
          "Set page titles through the `metadata` export, not `<head>` tags.",
        ],
      };
    case "astro":
      return {
        structure: [
          "Pages are `.astro` files in `src/pages/`; layouts in `src/layouts/`, components in `src/components/`.",
        ],
        rules: [
          "Pages render to static HTML; interactivity goes in `<script>` tags or client islands.",
        ],
      };
    case "angular":
      return {
        structure: [
          "`src/app/` holds the app: `app.config.ts`, `app.routes.ts`, pages in `src/app/pages/`, components in `src/app/components/`.",
          "Each component is a `.ts` class with an external `.html` template.",
        ],
        rules: [
          "Standalone components and signals; the app is zoneless.",
          "Generate code with `ng generate` (component, service, …) to keep the conventions.",
        ],
      };
  }
}

/** Short rules for selected modules, in selection order. */
function moduleNotes(ctx: Ctx): string[] {
  const notes: Record<string, string> = {
    tailwind:
      "Style with Tailwind CSS utility classes (v4: configuration lives in CSS, there is no tailwind.config).",
    sass: "Global styles are SCSS.",
    shadcn:
      "UI components come from shadcn/ui in `components/ui`; add new ones with `npx shadcn@latest add <component>` rather than writing them by hand.",
    "shadcn-vue":
      "UI components come from shadcn-vue in `components/ui`; add new ones with `npx shadcn-vue@latest add <component>`.",
    "shadcn-svelte":
      "UI components come from shadcn-svelte in `src/lib/components/ui`; add new ones with `npx shadcn-svelte@latest add <component>`.",
    mui: "Build UI with Material UI components and the `sx` prop; the theme is in `theme`.",
    "chakra-ui": "Build UI with Chakra UI components and style props.",
    mantine: "Build UI with Mantine components and their style props.",
    primevue: "Build UI with PrimeVue components (Aura theme).",
    vuetify:
      "Build UI with Vuetify components; the app is wrapped in `<v-app>`.",
    "angular-material":
      "Build UI with Angular Material components (Material 3 theme in `material-theme.scss`).",
    "redux-toolkit":
      "Shared state lives in the Redux Toolkit store; add state as slices.",
    zustand: "Shared state lives in Zustand stores.",
    pinia: "Shared state lives in Pinia stores (setup syntax).",
    "react-router": "Routes are declared with React Router.",
    "vue-router": "Routes are declared in the Vue Router config.",
    "solid-router": "Routes are declared with Solid Router.",
    "preact-iso": "Routes are declared with preact-iso.",
    axios:
      "Call the API through the shared Axios client; its base URL comes from an environment variable (see `.env.example`).",
    vitest:
      "Tests use Vitest; put `*.test.*` files next to the code they test.",
    "testing-library":
      "Component tests use Testing Library: query by role or text and simulate users with `user-event`.",
    eslint:
      "ESLint flat config in `eslint.config.*`; fix lint errors instead of disabling rules.",
    prettier: "Prettier formats the code; don't hand-format.",
    biome: "Biome lints and formats (`biome.json`); it also sorts imports.",
    seo: "SEO metadata, sitemap and robots.txt are generated from the site URL; keep page titles and descriptions meaningful.",
    turborepo:
      "Turborepo workspace: the app is in `apps/web` (paths above are relative to it); run tasks from the repository root.",
    "module-federation":
      "Module Federation host: the counter is loaded at runtime from the separate remote project.",
  };
  // `ctx.has` also covers modules added automatically through `requires`.
  return Object.entries(notes).flatMap(([id, note]) =>
    ctx.has(id) ? [note] : [],
  );
}

/** Script names worth running before handing a change back. */
export function checkScripts(model: ProjectModel): string[] {
  return ["lint", "check", "typecheck", "test"].filter(
    (s) => s in model.pkg.scripts,
  );
}

/** Scripts an agent may run without asking (no servers, no install hooks). */
export function agentScripts(model: ProjectModel): string[] {
  return Object.keys(model.pkg.scripts).filter(
    (s) => !SERVER_SCRIPTS.has(s) && !OUTWARD_SCRIPTS.has(s),
  );
}

export function agentsMd(model: ProjectModel, ctx: Ctx): string {
  const { name, packageManager: pm, framework } = ctx.selection;
  const notes = frameworkNotes(framework, ctx);
  const scripts = Object.keys(model.pkg.scripts).filter(
    (s) => s !== "prepare" && s !== "postinstall",
  );
  const checks = checkScripts(model);
  return file([
    `# ${name}`,
    "",
    `Stack: ${model.readme.stack.join(", ")}.`,
    "",
    "## Commands",
    "",
    `- \`${installCommand(pm)}\`: install dependencies`,
    ...scripts.map(
      (s) =>
        `- \`${runCommand(pm, s)}\`${SCRIPT_PURPOSE[s] ? `: ${SCRIPT_PURPOSE[s]}` : ""}`,
    ),
    "",
    "## Project structure",
    "",
    ...notes.structure.map((line) => `- ${line}`),
    "",
    "## Conventions",
    "",
    ...[...notes.rules, ...moduleNotes(ctx)].map((line) => `- ${line}`),
    ...(ctx.isTs ? ["- TypeScript strict mode; avoid `any`."] : []),
    ...(checks.length
      ? [
          "",
          "## Before finishing a change",
          "",
          `Run ${checks.map((s) => `\`${runCommand(pm, s)}\``).join(", ")} and fix what they report.`,
        ]
      : []),
  ]);
}

/** Official MCP servers for the selected stack, in `.mcp.json` `mcpServers` form. */
export function mcpServers(ctx: Ctx): Record<string, Record<string, unknown>> {
  const servers: Record<string, Record<string, unknown>> = {};
  const npx = (...args: string[]) => ({ command: "npx", args });
  switch (ctx.selection.framework) {
    case "next":
      servers["next-devtools"] = npx("-y", "next-devtools-mcp@latest");
      break;
    case "nuxt":
      servers["nuxt"] = { type: "http", url: "https://nuxt.com/mcp" };
      break;
    case "svelte":
    case "sveltekit":
      servers["svelte"] = npx("-y", "@sveltejs/mcp");
      break;
    case "angular":
      servers["angular-cli"] = npx("-y", "@angular/cli", "mcp");
      break;
    case "astro":
      servers["astro-docs"] = {
        type: "http",
        url: "https://mcp.docs.astro.build/mcp",
      };
      break;
    default:
      break;
  }
  if (ctx.has("shadcn")) servers["shadcn"] = npx("shadcn@latest", "mcp");
  if (ctx.has("mui")) servers["mui-mcp"] = npx("-y", "@mui/mcp@latest");
  if (ctx.has("chakra-ui"))
    servers["chakra-ui"] = npx("-y", "@chakra-ui/react-mcp");
  if (ctx.has("mantine")) servers["mantine"] = npx("-y", "@mantine/mcp-server");
  return servers;
}
