import { file } from "../../engine/code";
import type { Ctx, FrameworkId, Module, ProjectModel } from "../../types";

/**
 * Sentry error monitoring with each framework's own SDK (Preact has no guide, so it uses
 * `@sentry/browser`). `src/sentry` holds the setup; it does nothing until `SENTRY_DSN` is set,
 * which is how Sentry's docs say to turn the SDK off. Errors and a sample of page-load traces
 * are sent; Session Replay and the feedback widget are left out to keep the bundle small.
 */
const packages: Partial<Record<FrameworkId, string>> = {
  react: "@sentry/react",
  vue: "@sentry/vue",
  solid: "@sentry/solid",
  preact: "@sentry/browser",
};

/** The options every SDK takes; `dsn` is checked by the caller. */
const initOptions = (extra: string[] = []) => [
  "Sentry.init({",
  ...extra.map((line) => `  ${line}`),
  "  dsn,",
  "  integrations: [Sentry.browserTracingIntegration()],",
  "  // Traces 10% of page loads; raise it while trying things out.",
  "  tracesSampleRate: 0.1,",
  "});",
];

export const sentry: Module = {
  id: "sentry",
  name: "Sentry",
  category: "monitoring",
  description: {
    az: "Sentry ilə xəta monitorinqi və performans izləmə; DSN verilənə qədər söndürülüb.",
    en: "Error monitoring and tracing with Sentry; off until you set a DSN.",
    ru: "Мониторинг ошибок и трассировка с Sentry; выключено, пока не задан DSN.",
  },
  frameworks: ["react", "vue", "solid", "preact"],
  apply(model, ctx) {
    const pkg = packages[ctx.selection.framework];
    if (!pkg) throw new Error(`no Sentry SDK for ${ctx.selection.framework}`);
    model.pkg.dependencies.add(pkg);
    const env = ctx.env("SENTRY_DSN");
    model.env[env.key] = "";
    if (ctx.selection.framework === "vue") vuePlugin(model, ctx, env.read);
    else initFunction(model, ctx, pkg, env.read);
    model.readme.stack.push("Sentry");
    model.readme.sections.push({
      title: "Error monitoring",
      body: `Sentry starts once \`${env.key}\` is set: create a project at sentry.io, copy its DSN into \`.env\` (see \`.env.example\`), then rebuild. Without it nothing is sent.`,
    });
  },
};

/** React, Solid and Preact: `initSentry()` runs in the entry before the app renders. */
function initFunction(
  model: ProjectModel,
  ctx: Ctx,
  pkg: string,
  readDsn: string,
): void {
  model.files.set(
    ctx.src(`sentry.${ctx.ext.script}`),
    file([
      `import * as Sentry from "${pkg}";`,
      "",
      "/** Sends errors and traces to Sentry; stays off until the DSN is set (see .env.example). */",
      "export function initSentry() {",
      `  const dsn = ${readDsn};`,
      "  if (!dsn) return;",
      ...initOptions().map((line) => `  ${line}`),
      "}",
    ]),
  );
  model.entry.imports.push({ from: "./sentry", named: ["initSentry"] });
  model.entry.setup.push("initSentry();");
}

/** Vue: a plugin, because Sentry's Vue SDK takes the app to hook into its error handler. */
function vuePlugin(model: ProjectModel, ctx: Ctx, readDsn: string): void {
  const ts = ctx.isTs;
  model.files.set(
    ctx.src(`sentry.${ctx.ext.script}`),
    file([
      'import * as Sentry from "@sentry/vue";',
      ...(ts ? ['import type { App } from "vue";'] : []),
      "",
      "/** `app.use(sentry)`: sends errors and traces once the DSN is set (see .env.example). */",
      "export const sentry = {",
      `  install(app${ts ? ": App" : ""}) {`,
      `    const dsn = ${readDsn};`,
      "    if (!dsn) return;",
      ...initOptions(["app,"]).map((line) => `    ${line}`),
      "  },",
      "};",
    ]),
  );
  model.entry.imports.push({ from: "./sentry", named: ["sentry"] });
  model.entry.appUses.push("sentry");
}
