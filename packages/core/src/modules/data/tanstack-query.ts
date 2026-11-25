import { file, kebab, renderImports } from "../../engine/code";
import { demoClasses } from "../../frameworks/shared/demo";
import type { Ctx, FrameworkId, Module, ProjectModel } from "../../types";

const WIDGET = "StackList";
const LOADING = "Loading…";
const FAILED = "Could not load the stack.";

const packages: Partial<Record<FrameworkId, string>> = {
  react: "@tanstack/react-query",
  solid: "@tanstack/solid-query",
  vue: "@tanstack/vue-query",
  svelte: "@tanstack/svelte-query",
  angular: "@tanstack/angular-query",
};

/** `api/stack`: loads the stack list the app serves from `public/stack.json`. */
function fetchStackFile(ctx: Ctx, angular: boolean): string {
  // Angular resolves relative URLs against `<base href>`; Vite apps use BASE_URL.
  const url = angular
    ? '"stack.json"'
    : "`${import.meta.env.BASE_URL}stack.json`";
  return file([
    "/** Loads the stack list served from `public/stack.json`. */",
    `export async function fetchStack()${ctx.isTs ? ": Promise<string[]>" : ""} {`,
    `  const response = await fetch(${url});`,
    "  if (!response.ok) throw new Error(`Request failed: ${response.status}`);",
    "  return response.json();",
    "}",
  ]);
}

/** The widget: a query with its loading, error and success states. */
function widgetFiles(
  framework: FrameworkId,
  ctx: Ctx,
  pkg: string,
  text: string,
): [string, string][] {
  const x = ctx.ext.component;
  switch (framework) {
    case "react":
      return [
        [
          `src/components/${WIDGET}.${x}`,
          file([
            ...renderImports([
              { from: pkg, named: ["useQuery"] },
              { from: "../api/stack", named: ["fetchStack"] },
            ]),
            "",
            `export default function ${WIDGET}() {`,
            '  const stack = useQuery({ queryKey: ["stack"], queryFn: fetchStack });',
            "",
            "  return (",
            `    <p className="${text}">`,
            "      {stack.isPending",
            `        ? "${LOADING}"`,
            "        : stack.isError",
            `          ? "${FAILED}"`,
            '          : `Built with ${stack.data.join(", ")}.`}',
            "    </p>",
            "  );",
            "}",
          ]),
        ],
      ];
    case "solid":
      return [
        [
          `src/components/${WIDGET}.${x}`,
          file([
            ...renderImports([
              { from: pkg, named: ["useQuery"] },
              { from: "solid-js", named: ["Match", "Switch"] },
              { from: "../api/stack", named: ["fetchStack"] },
            ]),
            "",
            `export default function ${WIDGET}() {`,
            '  const stack = useQuery(() => ({ queryKey: ["stack"], queryFn: fetchStack }));',
            "",
            "  return (",
            `    <p class="${text}">`,
            "      <Switch>",
            `        <Match when={stack.isPending}>${LOADING}</Match>`,
            `        <Match when={stack.isError}>${FAILED}</Match>`,
            "        <Match when={stack.data}>",
            '          {(data) => `Built with ${data().join(", ")}.`}',
            "        </Match>",
            "      </Switch>",
            "    </p>",
            "  );",
            "}",
          ]),
        ],
      ];
    case "vue":
      return [
        [
          `src/components/${WIDGET}.vue`,
          file([
            `<script setup${ctx.isTs ? ' lang="ts"' : ""}>`,
            ...renderImports([
              { from: pkg, named: ["useQuery"] },
              { from: "../api/stack", named: ["fetchStack"] },
            ]),
            "",
            "const { isPending, isError, data } = useQuery({",
            '  queryKey: ["stack"],',
            "  queryFn: fetchStack,",
            "});",
            "</script>",
            "",
            "<template>",
            `  <p v-if="isPending" class="${text}">${LOADING}</p>`,
            `  <p v-else-if="isError" class="${text}">${FAILED}</p>`,
            `  <p v-else class="${text}">Built with {{ data?.join(", ") }}.</p>`,
            "</template>",
          ]),
        ],
      ];
    case "svelte":
      return [
        [
          `src/lib/${WIDGET}.svelte`,
          file([
            `<script${ctx.isTs ? ' lang="ts"' : ""}>`,
            ...renderImports([
              { from: pkg, named: ["createQuery"] },
              { from: "../api/stack", named: ["fetchStack"] },
            ]).map((line) => `  ${line}`),
            "",
            "  const stack = createQuery(() => ({",
            '    queryKey: ["stack"],',
            "    queryFn: fetchStack,",
            "  }));",
            "</script>",
            "",
            `<p class="${text}">`,
            "  {#if stack.isPending}",
            `    ${LOADING}`,
            "  {:else if stack.isError}",
            `    ${FAILED}`,
            "  {:else}",
            '    Built with {stack.data.join(", ")}.',
            "  {/if}",
            "</p>",
          ]),
        ],
      ];
    case "angular": {
      const name = kebab(WIDGET);
      const dir = `src/app/components/${name}`;
      return [
        [
          `${dir}/${name}.ts`,
          file([
            ...renderImports([
              { from: "@angular/core", named: ["Component"] },
              { from: pkg, named: ["injectQuery"] },
              { from: "../../api/stack", named: ["fetchStack"] },
            ]),
            "",
            "@Component({",
            `  selector: "app-${name}",`,
            `  templateUrl: "./${name}.html",`,
            "})",
            `export class ${WIDGET} {`,
            "  protected readonly stack = injectQuery(() => ({",
            '    queryKey: ["stack"],',
            "    queryFn: fetchStack,",
            "  }));",
            "}",
          ]),
        ],
        [
          `${dir}/${name}.html`,
          file([
            `<p class="${text}">`,
            "  @if (stack.isPending()) {",
            `    ${LOADING}`,
            "  } @else if (stack.isError()) {",
            `    ${FAILED}`,
            // Signals don't narrow; `as data` gives the template a defined value.
            "  } @else if (stack.data(); as data) {",
            '    Built with {{ data.join(", ") }}.',
            "  }",
            "</p>",
          ]),
        ],
      ];
    }
    default:
      return [];
  }
}

/** QueryClient wiring: a provider (React, Solid, Svelte), a plugin (Vue) or a provider fn. */
function wireClient(
  model: ProjectModel,
  framework: FrameworkId,
  pkg: string,
): void {
  switch (framework) {
    case "vue":
      model.entry.imports.push({ from: pkg, named: ["VueQueryPlugin"] });
      model.entry.appUses.push("VueQueryPlugin");
      return;
    case "angular":
      model.entry.imports.push({
        from: pkg,
        named: ["provideTanStackQuery", "QueryClient"],
      });
      model.entry.appUses.push("provideTanStackQuery(() => new QueryClient())");
      return;
    default:
      model.entry.setup.push("const queryClient = new QueryClient();");
      model.entry.providers.push({
        id: "tanstack-query",
        open: "<QueryClientProvider client={queryClient}>",
        close: "</QueryClientProvider>",
        imports: [{ from: pkg, named: ["QueryClient", "QueryClientProvider"] }],
        order: 1,
      });
  }
}

/**
 * TanStack Query: a QueryClient for the app and a `StackList` widget under the counter that
 * queries `public/stack.json` (written by `finalize` from the project's stack), so the demo
 * shows loading, error and data states without a backend or network access.
 */
export const tanstackQuery: Module = {
  id: "tanstack-query",
  name: "TanStack Query",
  category: "data",
  description: {
    az: "Server state: keşləmə, təkrar sorğular, yüklənmə və xəta halları.",
    en: "Server state: caching, refetching, loading and error states.",
  },
  frameworks: ["react", "solid", "vue", "svelte", "angular"],
  apply(model, ctx) {
    const framework = ctx.selection.framework;
    const pkg = packages[framework];
    if (!pkg) throw new Error(`no TanStack Query package for ${framework}`);
    model.pkg.dependencies.add(pkg);
    wireClient(model, framework, pkg);

    const angular = framework === "angular";
    model.files.set(
      `src/${angular ? "app/" : ""}api/stack.${ctx.ext.script}`,
      fetchStackFile(ctx, angular),
    );
    for (const [path, content] of widgetFiles(
      framework,
      ctx,
      pkg,
      demoClasses(model).text,
    )) {
      model.files.set(path, content);
    }
    model.demo.widgets.push(WIDGET);
    model.demo.stackJson = "public/stack.json";
    model.readme.stack.push("TanStack Query");
  },
};
