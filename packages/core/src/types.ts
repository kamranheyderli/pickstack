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
  | "quality";

export interface Selection {
  name: string;
  framework: FrameworkId;
  language: Language;
  packageManager: PackageManager;
  /** Module ids picked by the user. Required modules are added by `resolve`. */
  modules: string[];
}

export interface Ctx {
  selection: Selection;
  has(moduleId: string): boolean;
  ext: { script: "js" | "ts"; component: string };
  isTs: boolean;
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
}

export interface ProjectModel {
  files: Map<string, string>;
  pkg: {
    dependencies: Set<string>;
    devDependencies: Set<string>;
    scripts: Record<string, string>;
  };
  entry: {
    imports: ImportSpec[];
    providers: ProviderSpec[];
    appUses: string[];
    setup: string[];
  };
  bundler: { plugins: ImportedCall[] };
  styles: {
    /** CSS `@import` lines placed at the top of the global stylesheet. */
    globalImports: string[];
    globalCss: string[];
    /** Utility-first frameworks replace the demo's hand-written CSS classes. */
    mode: "plain" | "tailwind";
  };
  routes: RouteSpec[];
  routing: RoutingSpec | null;
  demo: { counter: CounterSpec | null };
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
