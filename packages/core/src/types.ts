export type FrameworkId =
  | "react"
  | "vue"
  | "svelte"
  | "solid"
  | "preact"
  | "angular"
  | "next"
  | "nuxt"
  | "sveltekit"
  | "astro";

export type Language = "js" | "ts";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export type Category =
  | "style"
  | "ui"
  | "state"
  | "routing"
  | "data"
  | "forms"
  | "testing"
  | "quality"
  | "seo"
  | "tooling"
  | "ai";

export interface Selection {
  name: string;
  framework: FrameworkId;
  language: Language;
  packageManager: PackageManager;
  /** Public origin used for canonical URLs, sitemaps and llms.txt (default https://example.com). */
  siteUrl?: string;
  /** Module ids picked by the user. Required modules are added by `resolve`. */
  modules: string[];
  /** Copyright year for the license file (default: the current year). */
  year?: number;
}

/** A public (client-exposed) environment variable: the `.env` key and the code that reads it. */
export interface PublicEnv {
  key: string;
  read: string;
}

export interface Ctx {
  selection: Selection;
  has(moduleId: string): boolean;
  ext: { script: "js" | "ts"; component: string };
  isTs: boolean;
  /** Directory holding app source (`src`, `app`, or `` for the project root). */
  srcDir: string;
  /** Joins a path under `srcDir`. */
  src(path: string): string;
  /** Framework build/cache directories (for ignore files). */
  ignore: string[];
  env(name: string): PublicEnv;
}

/** `import Default, { a, b } from "from"`, or a side-effect import when only `from` is set. */
export interface ImportSpec {
  from: string;
  default?: string;
  named?: string[];
  /** Named imports emitted as `import type { ... }`. */
  types?: string[];
}

/** A JSX wrapper around the app root, e.g. `<Provider store={store}>`. Lower `order` = outer. */
export interface ProviderSpec {
  id: string;
  open: string;
  close: string;
  imports: ImportSpec[];
  order: number;
}

/** A call such as `tailwindcss()` together with the import it needs. */
export interface ImportedCall {
  import: ImportSpec;
  call: string;
}

export type DemoPage = "home" | "about";

export interface RouteSpec {
  path: string;
  label: string;
  /** Component name, also used as the file name under `src/pages/`. */
  component: string;
  page: DemoPage;
}

/** How the demo counter gets its state. Filled by state modules; adapters fall back to local state. */
export interface CounterSpec {
  imports: ImportSpec[];
  /** Statements at the top of the component body. */
  setup: string[];
  value: string;
  increment: string;
  decrement: string;
  /** What a component test needs around the counter, e.g. the store provider it reads from. */
  testHarness?: CounterTestHarness;
}

/**
 * Context a component test mounts the counter with. Relative import paths are relative to the
 * counter's own directory (tests that live elsewhere only use package imports).
 */
export interface CounterTestHarness {
  imports: ImportSpec[];
  /** JSX wrapper around `<Counter />`, e.g. `<Provider store={store}>`. */
  wrapper?: { open: string; close: string };
  /** Vue app plugins installed on mount, e.g. `createPinia()`. */
  plugins?: string[];
  /** Packages Vitest must bundle instead of externalizing (e.g. ones that import CSS). */
  inlineDeps?: string[];
}

/** The counter's state expressions, as a `CounterSpec` gives them. */
export type CounterBinding = Pick<
  CounterSpec,
  "value" | "increment" | "decrement"
>;

/**
 * How the counter card is drawn with a UI kit's components. State modules still own the
 * value and handlers (`CounterSpec`); the view only places them in the kit's markup.
 */
export interface CounterView {
  /** Imports the markup needs (script imports; Angular: the TS imports). */
  imports: ImportSpec[];
  /** Angular standalone components to list in the component's `imports`. */
  components?: string[];
  markup(counter: CounterBinding): string[];
  /** Markup around the app's root (Vuetify needs everything inside `<v-app>`). */
  appShell?: { open: string[]; close: string[] };
  /** What a component test needs to mount the kit's components (e.g. its Vue plugin). */
  testHarness?: CounterTestHarness;
}

/** How the demo app renders navigation and the active route. Filled by routing modules. */
export interface RoutingSpec {
  imports: ImportSpec[];
  /** Component used for nav links, e.g. `Link`. */
  link: string;
  /** Prop holding the target path, e.g. `to` or `href`. */
  linkProp: string;
  /** JSX lines that render the active route, indented relative to the outlet position. */
  outlet: string[];
  /**
   * When the router owns the root (Solid's `<Router root={App}>`), the entry renders this tree
   * instead of `<App />`, and App becomes a layout taking `layoutParam`.
   */
  root?: {
    imports: ImportSpec[];
    tree: string[];
    layoutParam: string;
    layoutImports: ImportSpec[];
  };
  /**
   * File-based routes (TanStack Router): the adapter writes `src/routes/` and the route tree
   * from this router package instead of `App` and `pages/`.
   */
  fileRoutes?: "@tanstack/react-router" | "@tanstack/solid-router";
}

export interface SeoSpec {
  siteUrl: string;
  description: string;
  /** AI crawler rules in robots.txt and an llms.txt file. */
  ai: boolean;
}

/** Set by the `vitest` module. Adapters render the test config and a counter test from it. */
export interface TestingSpec {
  /** Set by `testing-library`: the counter test uses `render`, `screen` and `user-event`. */
  library: boolean;
  /** Vitest `setupFiles`, relative to the project root. */
  setupFiles: string[];
}

/**
 * Set by the `turborepo` module. `finalize` then moves the app to `apps/web` and writes the
 * workspace root around it.
 */
export interface MonorepoSpec {
  /** Build outputs turbo caches, e.g. `dist/**` or `.next/**`. */
  outputs: string[];
  /** Run typecheck after build (Next and SvelteKit generate types during the build). */
  typecheckAfterBuild: boolean;
  /** Non-prefixed variables read at build time; strict env mode drops the rest. */
  buildEnv: string[];
}

/**
 * Set by the `module-federation` module: the app is a Module Federation host that loads
 * components from a remote. `finalize` writes them as two independent projects, `host/` and
 * `remote/`, since micro-frontends are built and deployed separately.
 */
export interface FederationSpec {
  hostPort: number;
  remotePort: number;
  /** The remote project's files, relative to `remote/`. */
  remote: Map<string, string>;
}

export interface ProjectModel {
  files: Map<string, string>;
  pkg: {
    dependencies: Set<string>;
    devDependencies: Set<string>;
    scripts: Record<string, string>;
    /** Extra top-level package.json fields, e.g. `imports` for SvelteKit's `#lib`. */
    fields: Record<string, unknown>;
  };
  entry: {
    imports: ImportSpec[];
    providers: ProviderSpec[];
    appUses: string[];
    setup: string[];
    /** Extra tags for the HTML document `<head>` (fonts a UI kit needs; JSX in Next). */
    head: string[];
    /** Extra attributes on Next's `<html>` element, e.g. `suppressHydrationWarning`. */
    htmlAttrs: string[];
  };
  bundler: {
    plugins: ImportedCall[];
    /** Framework modules/integrations, e.g. Nuxt's `modules: ["@pinia/nuxt"]`. */
    modules: string[];
    /**
     * Extra top-level keys for the framework config file (nuxt.config, astro.config). Values
     * are data; wrap code such as an imported identifier in `raw()`.
     */
    config: Record<string, unknown>;
    /** Imports the config file needs for `raw()` values in `config`. */
    configImports: ImportSpec[];
    /** PostCSS plugins and their options; rendered as `postcss.config.mjs` (React, Next). */
    postcss: Record<string, unknown>;
    /** Path alias for `src` (`@` → `./src`), e.g. for shadcn/ui; React (Vite) only. */
    srcAlias: string | null;
    /** Integrations called in the config, e.g. Astro's `integrations: [sitemap()]`. */
    integrations: ImportedCall[];
  };
  styles: {
    /** CSS `@import` lines placed at the top of the global stylesheet. */
    globalImports: string[];
    globalCss: string[];
    /** Utility-first frameworks replace the demo's hand-written CSS classes. */
    mode: "plain" | "tailwind";
    /** Set by the `sass` module: the global stylesheet is SCSS unless Tailwind owns it. */
    sass: boolean;
    /** Stylesheets loaded before the global one, e.g. a UI kit theme (Angular `styles`). */
    preload: string[];
  };
  routes: RouteSpec[];
  routing: RoutingSpec | null;
  demo: {
    counter: CounterSpec | null;
    /** Set by a UI kit module. */
    view: CounterView | null;
    /**
     * Components shown under the counter on the home page. Each lives where the framework keeps
     * components: `components/<Name>` (JSX, Vue), `lib/<Name>.svelte`, Angular
     * `app/components/<kebab-name>/`.
     */
    widgets: string[];
    /** Where `finalize` serves the stack list as JSON (a data-fetching demo reads it). */
    stackJson: string | null;
  };
  /** Set by the `seo` module; `ai` is turned on by `aio`. Adapters render head tags from it. */
  seo: SeoSpec | null;
  /**
   * Set by a linter module. Angular wires ESLint into angular.json as the `ng lint` target;
   * adapters add the linter's suppression comment where generated code needs one.
   */
  linter: "eslint" | "biome" | null;
  /**
   * Set by a formatter module. Files core pre-formats itself (Astro markup) follow its style,
   * since Prettier and Biome differ on inline text.
   */
  formatter: "prettier" | "biome" | null;
  monorepo: MonorepoSpec | null;
  federation: FederationSpec | null;
  /**
   * Files that belong at the repository root (AI agent config): they stay at the root of a
   * Turborepo workspace instead of moving into `apps/web`.
   */
  repoFiles: Map<string, string>;
  /** Extra `.gitignore` entries, e.g. personal agent settings. */
  gitignore: string[];
  /**
   * Generated files written exactly as their tool writes them (e.g. TanStack Router's route
   * tree): not formatted, and excluded from the linter and formatter.
   */
  verbatim: Set<string>;
  testing: TestingSpec | null;
  readme: { stack: string[]; sections: { title: string; body: string }[] };
  warnings: string[];
}

export interface LocalizedText {
  az: string;
  en: string;
}

export interface Module {
  id: string;
  name: string;
  category: Category;
  description: LocalizedText;
  frameworks: FrameworkId[] | "all";
  languages?: Language[];
  requires?: string[];
  /** At least one of these must be selected (not auto-added: the user picks which). */
  requiresOneOf?: string[];
  conflicts?: string[];
  order?: number;
  apply(model: ProjectModel, ctx: Ctx): void;
}

export interface FrameworkAdapter {
  id: FrameworkId;
  name: string;
  kind: "spa" | "meta";
  languages: Language[];
  /** File extension for components in the given language. */
  componentExt(language: Language): string;
  srcDir: string;
  publicEnv(name: string): PublicEnv;
  /** Framework build/cache directories added to .gitignore and .prettierignore. */
  ignore?: string[];
  /** Prettier parser overrides by extension (`null` skips formatting that extension). */
  formatParsers?: Record<string, string | null>;
  base(ctx: Ctx): ProjectModel;
  render(model: ProjectModel, ctx: Ctx): void;
}

export type ValidationCode =
  | "invalid-name"
  | "unknown-framework"
  | "unsupported-language"
  | "unknown-module"
  | "framework-mismatch"
  | "language-mismatch"
  | "conflict"
  | "missing-one-of"
  | "single-category";

export interface ValidationError {
  code: ValidationCode;
  message: string;
  moduleId?: string;
  otherId?: string;
}

export type GenerateResult =
  | {
      ok: true;
      files: Map<string, string>;
      /** Final module list in application order, including auto-added ones. */
      modules: string[];
      autoAdded: string[];
      warnings: string[];
    }
  | { ok: false; errors: ValidationError[] };
