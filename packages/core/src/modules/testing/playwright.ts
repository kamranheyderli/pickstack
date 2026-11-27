import { file, renderImports } from "../../engine/code";
import { runCommand } from "../../engine/finalize";
import { devPorts } from "../../frameworks/catalog";
import type { Ctx, FrameworkId, Module, ProjectModel } from "../../types";

/** Frameworks whose demo always has an About page; SPAs get one from a router module. */
const ALWAYS_ROUTED: ReadonlySet<FrameworkId> = new Set([
  "angular",
  "next",
  "nuxt",
  "sveltekit",
  "astro",
]);

/**
 * The dev command for the web server. Astro moves `astro dev` to the background when an AI
 * agent runs it, so Playwright would see it exit; `--ignore-lock` keeps it in the foreground.
 */
function devCommand(ctx: Ctx): string {
  const pm = ctx.selection.packageManager;
  const dev = runCommand(pm, "dev");
  if (ctx.selection.framework !== "astro") return dev;
  return `${dev}${pm === "npm" ? " --" : ""} --ignore-lock`;
}

function config(ctx: Ctx): string {
  const url = `http://localhost:${devPorts[ctx.selection.framework]}`;
  return file([
    ...renderImports([
      { from: "node:process", default: "process" },
      { from: "@playwright/test", named: ["defineConfig", "devices"] },
    ]),
    "",
    "export default defineConfig({",
    '  testDir: "./e2e",',
    // `.e2e` keeps these out of Vitest, which picks up `*.spec` and `*.test` files.
    '  testMatch: "**/*.e2e.?(c|m)[jt]s",',
    "  fullyParallel: true,",
    "  forbidOnly: !!process.env.CI,",
    "  retries: process.env.CI ? 2 : 0,",
    '  reporter: "html",',
    `  use: { baseURL: "${url}", trace: "on-first-retry" },`,
    '  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],',
    "  webServer: {",
    `    command: "${devCommand(ctx)}",`,
    `    url: "${url}",`,
    "    reuseExistingServer: !process.env.CI,",
    "  },",
    "});",
  ]);
}

/** Server-rendered pages show the counter before hydration attaches its click handler. */
const SERVER_RENDERED: ReadonlySet<FrameworkId> = new Set([
  "next",
  "nuxt",
  "sveltekit",
  "astro",
]);

function spec(model: ProjectModel, ctx: Ctx): string {
  const click = 'page.getByRole("button", { name: "+1" }).click()';
  const one = 'page.getByText("1", { exact: true })';
  const counter = SERVER_RENDERED.has(ctx.selection.framework)
    ? [
        "  // Clicks before hydration are lost, so retry until the count changes.",
        "  await expect(async () => {",
        `    await ${click};`,
        `    await expect(${one}).toBeVisible({ timeout: 1000 });`,
        "  }).toPass();",
      ]
    : [`  await ${click};`, `  await expect(${one}).toBeVisible();`];
  const about =
    ALWAYS_ROUTED.has(ctx.selection.framework) ||
    model.routes.some((r) => r.page === "about");
  return file([
    ...renderImports([{ from: "@playwright/test", named: ["expect", "test"] }]),
    "",
    'test("the counter goes up", async ({ page }) => {',
    '  await page.goto("/");',
    ...counter,
    "});",
    ...(about
      ? [
          "",
          'test("the about page opens from the nav", async ({ page }) => {',
          '  await page.goto("/");',
          '  await page.getByRole("link", { name: "About" }).click();',
          "  await expect(page).toHaveURL(/about/);",
          '  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();',
          "});",
        ]
      : []),
  ]);
}

/**
 * Playwright end-to-end tests: a config that starts the dev server and a test that clicks
 * through the demo in Chromium.
 */
export const playwright: Module = {
  id: "playwright",
  name: "Playwright",
  category: "testing",
  description: {
    az: "Brauzerdə end-to-end testlər (Chromium).",
    en: "End-to-end tests in a real browser (Chromium).",
    ru: "End-to-end тесты в настоящем браузере (Chromium).",
  },
  frameworks: "all",
  // E2E runs against one app's dev server; a workspace or two projects need their own setup.
  conflicts: ["turborepo", "module-federation"],
  apply(model, ctx) {
    const pm = ctx.selection.packageManager;
    const x = ctx.ext.script;
    model.pkg.devDependencies.add("@playwright/test");
    // The config reads `process.env.CI`; Astro's starter doesn't ship Node types.
    if (ctx.isTs) model.pkg.devDependencies.add("@types/node");
    model.pkg.scripts["test:e2e"] = "playwright test";
    model.files.set(`playwright.config.${x}`, config(ctx));
    model.files.set(`e2e/app.e2e.${x}`, spec(model, ctx));
    model.gitignore.push(
      "/test-results/",
      "/playwright-report/",
      "/blob-report/",
      "/playwright/.cache/",
    );
    model.readme.stack.push("Playwright");
    model.readme.sections.push({
      title: "End-to-end tests",
      body: [
        "Install the browser once, then run the tests (they start the dev server themselves):",
        "",
        "```sh",
        `${pm === "npm" ? "npx" : pm === "pnpm" ? "pnpm exec" : pm === "yarn" ? "yarn" : "bunx"} playwright install chromium`,
        runCommand(pm, "test:e2e"),
        "```",
      ].join("\n"),
    });
  },
};
