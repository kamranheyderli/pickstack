import { file, renderImports } from "../../engine/code";
import { styleExt } from "../../frameworks/shared/demo";
import { mergeHarness } from "../../frameworks/shared/testing";
import type {
  CounterTestHarness,
  Ctx,
  FrameworkId,
  Module,
  ProjectModel,
} from "../../types";

interface Target {
  /** The Storybook framework package. */
  pkg: string;
  /** The counter component, relative to the project. */
  component: string;
  /** The global stylesheet, without its extension. */
  stylesheet: string;
}

const targets: Partial<Record<FrameworkId, Target>> = {
  react: {
    pkg: "@storybook/react-vite",
    component: "src/components/Counter",
    stylesheet: "src/index",
  },
  preact: {
    pkg: "@storybook/preact-vite",
    component: "src/components/Counter",
    stylesheet: "src/index",
  },
  vue: {
    pkg: "@storybook/vue3-vite",
    component: "src/components/CounterCard",
    stylesheet: "src/assets/main",
  },
  svelte: {
    pkg: "@storybook/svelte-vite",
    component: "src/lib/Counter",
    stylesheet: "src/app",
  },
};

const ADDONS = ["@storybook/addon-docs", "@storybook/addon-a11y"];

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

function mainConfig(ctx: Ctx, target: Target): string {
  const config = [
    "{",
    '  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],',
    `  addons: [${ADDONS.map((a) => `"${a}"`).join(", ")}],`,
    `  framework: "${target.pkg}",`,
    "}",
  ];
  return file(
    ctx.isTs
      ? [
          `import type { StorybookConfig } from "${target.pkg}";`,
          "",
          `const config: StorybookConfig = ${config[0]}`,
          ...config.slice(1, -1),
          "};",
          "",
          "export default config;",
        ]
      : [
          `/** @type {import("${target.pkg}").StorybookConfig} */`,
          `const config = ${config[0]}`,
          ...config.slice(1, -1),
          "};",
          "",
          "export default config;",
        ],
  );
}

/** preview: the app's global styles, and (Vue) the plugins the counter needs. */
function previewConfig(
  model: ProjectModel,
  ctx: Ctx,
  target: Target,
  harness: CounterTestHarness | undefined,
): string {
  const vuePlugins =
    ctx.selection.framework === "vue" ? (harness?.plugins ?? []) : [];
  return file([
    ...renderImports([
      ...(ctx.isTs ? [{ from: target.pkg, types: ["Preview"] }] : []),
      ...(vuePlugins.length ? [{ from: target.pkg, named: ["setup"] }] : []),
      ...(vuePlugins.length ? (harness?.imports ?? []) : []),
      { from: `../${target.stylesheet}.${styleExt(model)}` },
    ]),
    "",
    ...(vuePlugins.length
      ? [
          "// The counter reads app-level plugins, as it does in the app.",
          "setup((app) => {",
          ...vuePlugins.map((p) => `  app.use(${p});`),
          "});",
          "",
        ]
      : []),
    ...(ctx.isTs
      ? []
      : ['/** @type {import("' + target.pkg + '").Preview} */']),
    `const preview${ctx.isTs ? ": Preview" : ""} = {`,
    "  parameters: {",
    "    controls: {",
    "      matchers: { color: /(background|color)$/i, date: /Date$/i },",
    "    },",
    "  },",
    "};",
    "",
    "export default preview;",
  ]);
}

/** A story for the counter; JSX frameworks wrap it in the providers it needs. */
function story(
  ctx: Ctx,
  target: Target,
  harness: CounterTestHarness | undefined,
): [string, string] {
  const fw = ctx.selection.framework;
  const name = baseName(target.component);
  const jsx = fw === "react" || fw === "preact";
  const wrapper = jsx ? harness?.wrapper : undefined;
  const ext = wrapper ? ctx.ext.component : ctx.ext.script;
  const componentFile =
    fw === "vue"
      ? `./${name}.vue`
      : fw === "svelte"
        ? `./${name}.svelte`
        : `./${name}`;
  const meta = [
    `  component: ${name},`,
    ...(wrapper
      ? [
          "  decorators: [",
          `    (Story) => (${wrapper.open}<Story />${wrapper.close}),`,
          "  ],",
        ]
      : []),
  ];
  return [
    `${target.component}.stories.${ext}`,
    file([
      ...renderImports([
        ...(ctx.isTs
          ? [{ from: target.pkg, types: ["Meta", "StoryObj"] }]
          : []),
        { from: componentFile, default: name },
        ...(wrapper ? (harness?.imports ?? []) : []),
      ]),
      "",
      ...(ctx.isTs
        ? [
            "const meta = {",
            ...meta,
            `} satisfies Meta<typeof ${name}>;`,
            "",
            "export default meta;",
            "type Story = StoryObj<typeof meta>;",
            "",
            "export const Default: Story = {};",
          ]
        : [
            "export default {",
            ...meta,
            "};",
            "",
            "export const Default = {};",
          ]),
    ]),
  ];
}

/**
 * Storybook 10 for the Vite SPAs, set up the way `storybook init` does minus its sample
 * components: docs and a11y addons, the app's global styles in the preview, and a story for
 * the demo counter (with the store or UI kit providers it needs).
 */
export const storybook: Module = {
  id: "storybook",
  name: "Storybook",
  category: "tooling",
  description: {
    az: "Komponentləri təcrid olunmuş mühitdə hazırlamaq və sənədləşdirmək üçün.",
    en: "Build and document components in isolation.",
    ru: "Разработка и документирование компонентов изолированно.",
  },
  frameworks: ["react", "preact", "vue", "svelte"],
  conflicts: ["module-federation"],
  apply(model, ctx) {
    const target = targets[ctx.selection.framework];
    if (!target)
      throw new Error(`no Storybook framework for ${ctx.selection.framework}`);
    const x = ctx.ext.script;
    model.pkg.devDependencies.add("storybook").add(target.pkg);
    for (const addon of ADDONS) model.pkg.devDependencies.add(addon);
    model.pkg.scripts["storybook"] = "storybook dev -p 6006";
    model.pkg.scripts["build-storybook"] = "storybook build";

    // The demo view (UI kit) wraps outside the counter's own state provider, as in the tests.
    const harness = mergeHarness(
      model.demo.view?.testHarness,
      model.demo.counter?.testHarness,
    );
    model.files.set(`.storybook/main.${x}`, mainConfig(ctx, target));
    model.files.set(
      `.storybook/preview.${x}`,
      previewConfig(model, ctx, target, harness),
    );
    const [path, content] = story(ctx, target, harness);
    model.files.set(path, content);
    model.gitignore.push("storybook-static", "*storybook.log");
    // The static build is output, not source: keep linters and formatters out of it.
    model.verbatim.add("storybook-static");
    model.readme.stack.push("Storybook");
  },
};
