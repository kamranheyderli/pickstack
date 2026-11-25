import { file, indent, renderImports } from "../../engine/code";
import type {
  CounterTestHarness,
  Ctx,
  ImportSpec,
  ProjectModel,
  TestingSpec,
} from "../../types";

/**
 * Counter component tests rendered by the adapters when the `vitest` module is selected.
 * With `testing-library` they query like a user (`screen.getByRole`); otherwise they use the
 * framework's own mount API. Elements are found by tag and text, never by class, so the
 * tests hold with any styling module.
 */

const TEST_NAME = "increments when +1 is clicked";
const VITEST_IMPORT: ImportSpec = {
  from: "vitest",
  named: ["describe", "expect", "it"],
};

/** `/// <reference types="vitest/config" />` for a TS vite.config that carries a `test` block. */
export function vitestReference(ctx: Ctx): string[] {
  return ctx.isTs ? ['/// <reference types="vitest/config" />'] : [];
}

/** The `test` block of a Vite/Vitest config: jsdom plus the model's setup files. */
export function testBlock(
  testing: TestingSpec,
  environment = "jsdom",
): string[] {
  return [
    "test: {",
    `  environment: "${environment}",`,
    ...(testing.setupFiles.length
      ? [
          `  setupFiles: [${testing.setupFiles.map((f) => `"./${f}"`).join(", ")}],`,
        ]
      : []),
    "},",
  ];
}

/** Wraps `<Counter />` in the harness wrapper (e.g. a store provider). */
function counterJsx(harness: CounterTestHarness | undefined): string {
  const wrapper = harness?.wrapper;
  return wrapper ? `${wrapper.open}<Counter />${wrapper.close}` : "<Counter />";
}

function describeBlock(
  name: string,
  body: string[],
  async: boolean,
  test = TEST_NAME,
): string[] {
  return [
    `describe("${name}", () => {`,
    `  it("${test}", ${async ? "async " : ""}() => {`,
    ...indent(body, 2),
    "  });",
    "});",
  ];
}

/** The Testing Library body shared by every binding: click +1 as a user, expect 1. */
function userBody(render: string): string[] {
  return [
    "const user = userEvent.setup();",
    `${render};`,
    "",
    'await user.click(screen.getByRole("button", { name: "+1" }));',
    "",
    'expect(screen.getByText("1")).toBeInTheDocument();',
  ];
}

const USER_EVENT: ImportSpec = {
  from: "@testing-library/user-event",
  default: "userEvent",
};

const findPlus = (root: string) =>
  `const plus = [...${root}.querySelectorAll("button")].find((b) => b.textContent?.trim() === "+1");`;

export type JsxFamily = "react" | "preact" | "solid";

const jsxBindings: Record<JsxFamily, string> = {
  react: "@testing-library/react",
  preact: "@testing-library/preact",
  solid: "@solidjs/testing-library",
};

/** `Counter.test.{jsx,tsx}` next to `Counter`, for React, Next, Preact and Solid. */
export function jsxCounterTest(model: ProjectModel, family: JsxFamily): string {
  const testing = model.testing;
  if (!testing) throw new Error("jsxCounterTest requires model.testing");
  const harness = model.demo.counter?.testHarness;
  const jsx = counterJsx(harness);
  const element = family === "solid" ? `() => ${jsx}` : jsx;
  const imports: ImportSpec[] = [
    VITEST_IMPORT,
    { from: "./Counter", default: "Counter" },
    ...(harness?.imports ?? []),
  ];

  if (testing.library) {
    return file([
      ...renderImports([
        { from: jsxBindings[family], named: ["render", "screen"] },
        USER_EVENT,
        ...imports,
      ]),
      "",
      ...describeBlock("Counter", userBody(`render(${element})`), true),
    ]);
  }

  const mount = {
    react: {
      imports: [
        { from: "react", named: ["act"] },
        { from: "react-dom/client", named: ["createRoot"] },
      ],
      mount: [
        "const root = createRoot(container);",
        `act(() => root.render(${jsx}));`,
      ],
      click: "act(() => plus?.click());",
      unmount: "act(() => root.unmount());",
    },
    preact: {
      imports: [
        { from: "preact", named: ["render"] },
        { from: "preact/test-utils", named: ["act"] },
      ],
      mount: [`act(() => render(${jsx}, container));`],
      click: "act(() => plus?.click());",
      unmount: "render(null, container);",
    },
    solid: {
      imports: [{ from: "solid-js/web", named: ["render"] }],
      mount: [`const dispose = render(() => ${jsx}, container);`],
      click: "plus?.click();",
      unmount: "dispose();",
    },
  }[family];

  return file([
    ...renderImports([...mount.imports, ...imports]),
    "",
    ...describeBlock(
      "Counter",
      [
        'const container = document.createElement("div");',
        "document.body.append(container);",
        ...mount.mount,
        "",
        findPlus("container"),
        mount.click,
        "",
        'expect(container.querySelector("p")?.textContent).toBe("1");',
        "",
        mount.unmount,
        "container.remove();",
      ],
      false,
    ),
  ]);
}

/** `Counter.test.{js,ts}` next to `Counter.svelte`. */
export function svelteCounterTest(model: ProjectModel): string {
  const testing = model.testing;
  if (!testing) throw new Error("svelteCounterTest requires model.testing");
  const imports: ImportSpec[] = [
    VITEST_IMPORT,
    { from: "./Counter.svelte", default: "Counter" },
  ];
  if (testing.library) {
    return file([
      ...renderImports([
        { from: "@testing-library/svelte", named: ["render", "screen"] },
        USER_EVENT,
        ...imports,
      ]),
      "",
      ...describeBlock("Counter", userBody("render(Counter)"), true),
    ]);
  }
  return file([
    ...renderImports([
      { from: "svelte", named: ["flushSync", "mount", "unmount"] },
      ...imports,
    ]),
    "",
    ...describeBlock(
      "Counter",
      [
        "const component = mount(Counter, { target: document.body });",
        "",
        findPlus("document"),
        "plus?.click();",
        "flushSync();",
        "",
        'expect(document.querySelector("p")?.textContent).toBe("1");',
        "",
        "unmount(component);",
      ],
      false,
    ),
  ]);
}

/** Mount options installing the harness's Vue plugins, e.g. `createPinia()`. */
function vueMountOptions(harness: CounterTestHarness | undefined): string {
  const plugins = harness?.plugins ?? [];
  return plugins.length
    ? `, { global: { plugins: [${plugins.join(", ")}] } }`
    : "";
}

/**
 * Vue counter test. Vue mounts with `@vue/test-utils` (create-vue's `__tests__` layout); Nuxt
 * with `@nuxt/test-utils`' `*Suspended` helpers, which boot the app (and its plugins) first.
 */
export function vueCounterTest(
  model: ProjectModel,
  target: "vue" | "nuxt",
): string {
  const testing = model.testing;
  if (!testing) throw new Error("vueCounterTest requires model.testing");
  const nuxt = target === "nuxt";
  // Nuxt tests boot the app, which installs plugins; Vue mounts need the store's and the
  // UI kit's plugins passed in.
  const harness = nuxt
    ? undefined
    : mergeHarness(
        model.demo.counter?.testHarness,
        model.demo.view?.testHarness,
      );
  const options = vueMountOptions(harness);
  const imports: ImportSpec[] = [
    VITEST_IMPORT,
    {
      from: nuxt ? "~/components/CounterCard.vue" : "../CounterCard.vue",
      default: "CounterCard",
    },
    ...(harness?.imports ?? []),
  ];
  if (testing.library) {
    const render = nuxt
      ? "await renderSuspended(CounterCard)"
      : `render(CounterCard${options})`;
    return file([
      ...renderImports([
        nuxt
          ? { from: "@nuxt/test-utils/runtime", named: ["renderSuspended"] }
          : { from: "@testing-library/vue", named: ["render"] },
        { from: "@testing-library/vue", named: ["screen"] },
        USER_EVENT,
        ...imports,
      ]),
      "",
      ...describeBlock("CounterCard", userBody(render), true),
    ]);
  }
  return file([
    ...renderImports([
      nuxt
        ? { from: "@nuxt/test-utils/runtime", named: ["mountSuspended"] }
        : { from: "@vue/test-utils", named: ["mount"] },
      ...imports,
    ]),
    "",
    ...describeBlock(
      "CounterCard",
      [
        nuxt
          ? "const wrapper = await mountSuspended(CounterCard);"
          : `const wrapper = mount(CounterCard${options});`,
        "",
        'const plus = wrapper.findAll("button").find((b) => b.text() === "+1");',
        'await plus?.trigger("click");',
        "",
        'expect(wrapper.get("p").text()).toBe("1");',
      ],
      true,
    ),
  ]);
}

/**
 * `counter.spec.ts` next to the Angular counter. `ng test` runs Vitest with globals, as
 * `ng new` sets up, so `describe`/`it`/`expect` are not imported.
 */
export function angularCounterTest(model: ProjectModel): string {
  const testing = model.testing;
  if (!testing) throw new Error("angularCounterTest requires model.testing");
  const counter: ImportSpec = { from: "./counter", named: ["Counter"] };
  if (testing.library) {
    return file([
      ...renderImports([
        { from: "@testing-library/angular", named: ["render", "screen"] },
        USER_EVENT,
        counter,
      ]),
      "",
      ...describeBlock("Counter", userBody("await render(Counter)"), true),
    ]);
  }
  return file([
    ...renderImports([
      { from: "@angular/core/testing", named: ["TestBed"] },
      counter,
    ]),
    "",
    ...describeBlock(
      "Counter",
      [
        "const fixture = TestBed.createComponent(Counter);",
        "await fixture.whenStable();",
        "const element = fixture.nativeElement as HTMLElement;",
        "",
        findPlus("element"),
        "plus?.click();",
        "await fixture.whenStable();",
        "",
        'expect(element.querySelector("p")?.textContent?.trim()).toBe("1");',
      ],
      true,
    ),
  ]);
}

/**
 * Astro components render on the server, so the test uses the Container API and checks the
 * HTML; the click behaviour lives in a client script that runs in the browser.
 */
export function astroCounterTest(): string {
  return file([
    'import { experimental_AstroContainer as AstroContainer } from "astro/container";',
    ...renderImports([
      VITEST_IMPORT,
      { from: "./Counter.astro", default: "Counter" },
    ]),
    "",
    ...describeBlock(
      "Counter",
      [
        "const container = await AstroContainer.create();",
        "const html = await container.renderToString(Counter);",
        "",
        "expect(html).toMatch(/data-count[^>]*>\\s*0\\s*</);",
        "expect(html).toContain('data-step=\"1\"');",
        "expect(html).toContain('data-step=\"-1\"');",
      ],
      true,
      "renders the count and both buttons",
    ),
  ]);
}

function mergeHarness(
  ...harnesses: (CounterTestHarness | undefined)[]
): CounterTestHarness | undefined {
  const present = harnesses.filter((h) => h !== undefined);
  if (!present.length) return undefined;
  return {
    imports: present.flatMap((h) => h.imports),
    plugins: present.flatMap((h) => h.plugins ?? []),
    inlineDeps: present.flatMap((h) => h.inlineDeps ?? []),
  };
}
