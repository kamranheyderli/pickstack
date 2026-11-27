import { file } from "../../engine/code";
import type { Ctx, Module, ProjectModel } from "../../types";

/**
 * Web analytics, one provider at a time. Each writes `src/analytics` with an `initAnalytics()`
 * the entry calls before rendering; it does nothing until the provider's settings are in
 * `.env`, so a fresh project sends no data anywhere.
 */
const frameworks: Module["frameworks"] = ["react", "vue", "solid", "preact"];

interface Setting {
  /** Name after the framework's public prefix, e.g. MATOMO_URL. */
  name: string;
  /** `.env.example` value: empty, or a default such as Umami Cloud's script URL. */
  example: string;
}

function writeAnalytics(
  model: ProjectModel,
  ctx: Ctx,
  provider: string,
  settings: Setting[],
  body: (read: Record<string, string>) => string[],
  options: { imports?: string[]; tsGlobals?: string[]; readme: string },
): void {
  const read: Record<string, string> = {};
  for (const setting of settings) {
    const env = ctx.env(setting.name);
    read[setting.name] = env.read;
    model.env[env.key] = setting.example;
  }
  model.files.set(
    ctx.src(`analytics.${ctx.ext.script}`),
    file([
      ...(options.imports ?? []),
      ...(options.imports?.length ? [""] : []),
      ...(ctx.isTs && options.tsGlobals ? [...options.tsGlobals, ""] : []),
      ...body(read),
    ]),
  );
  model.entry.imports.push({ from: "./analytics", named: ["initAnalytics"] });
  model.entry.setup.push("initAnalytics();");
  model.readme.stack.push(provider);
  model.readme.sections.push({ title: "Analytics", body: options.readme });
}

const keys = (ctx: Ctx, names: string[]) =>
  names.map((n) => `\`${ctx.env(n).key}\``).join(" and ");

/**
 * Matomo's tracking code, plus a page view for every client-side navigation: Matomo's SPA guide
 * says it can't see those itself, so the router's `history.pushState` and the back button
 * (`popstate`) report the new URL, title and referrer.
 */
export const matomo: Module = {
  id: "matomo",
  name: "Matomo",
  category: "analytics",
  description: {
    az: "Matomo ilə açıq mənbəli, öz serverində saxlanıla bilən analitika; SPA keçidləri də sayılır.",
    en: "Open-source, self-hostable analytics with Matomo; client-side navigations count too.",
    ru: "Открытая аналитика Matomo, которую можно разместить у себя; переходы на клиенте тоже учитываются.",
  },
  frameworks,
  apply(model, ctx) {
    const ts = ctx.isTs;
    writeAnalytics(
      model,
      ctx,
      "Matomo",
      [
        { name: "MATOMO_URL", example: "" },
        { name: "MATOMO_SITE_ID", example: "" },
      ],
      (env) => [
        "/** Matomo's tracking code; off until the Matomo URL and site ID are set (see .env.example). */",
        "export function initAnalytics() {",
        `  const url = ${env["MATOMO_URL"]};`,
        `  const siteId = ${env["MATOMO_SITE_ID"]};`,
        "  if (!url || !siteId) return;",
        '  const base = url.endsWith("/") ? url : `${url}/`;',
        "  const paq = window._paq ?? [];",
        "  window._paq = paq;",
        '  paq.push(["trackPageView"]);',
        '  paq.push(["enableLinkTracking"]);',
        '  paq.push(["setTrackerUrl", `${base}matomo.php`]);',
        '  paq.push(["setSiteId", siteId]);',
        '  const script = document.createElement("script");',
        "  script.async = true;",
        "  script.src = `${base}matomo.js`;",
        "  document.head.append(script);",
        "",
        "  // Matomo can't see client-side navigations: report each URL the router moves to.",
        "  let previous = location.href;",
        "  const trackNavigation = () => {",
        "    if (location.href === previous) return;",
        '    paq.push(["setReferrerUrl", previous]);',
        "    previous = location.href;",
        '    paq.push(["setCustomUrl", location.href]);',
        '    paq.push(["setDocumentTitle", document.title]);',
        '    paq.push(["trackPageView"]);',
        "  };",
        "  const pushState = history.pushState.bind(history);",
        `  history.pushState = (...args${ts ? ': Parameters<History["pushState"]>' : ""}) => {`,
        "    pushState(...args);",
        "    trackNavigation();",
        "  };",
        '  window.addEventListener("popstate", trackNavigation);',
        "}",
      ],
      {
        tsGlobals: [
          "declare global {",
          "  interface Window {",
          "    _paq?: unknown[][];",
          "  }",
          "}",
        ],
        readme: `Matomo starts once ${keys(ctx, ["MATOMO_URL", "MATOMO_SITE_ID"])} are set in \`.env\` (see \`.env.example\`): your Matomo address (e.g. \`https://analytics.example.com\`) and the site's ID from Matomo's admin. Without them nothing is sent.`,
      },
    );
  },
};

/** Plausible's npm tracker: it counts `pushState` navigations by itself. */
export const plausible: Module = {
  id: "plausible",
  name: "Plausible",
  category: "analytics",
  description: {
    az: "Plausible ilə yüngül, cookie-siz analitika; SPA keçidlərini özü sayır.",
    en: "Lightweight, cookie-free analytics with Plausible; it counts client-side navigations itself.",
    ru: "Лёгкая аналитика без cookie с Plausible; сама учитывает переходы на клиенте.",
  },
  frameworks,
  apply(model, ctx) {
    model.pkg.dependencies.add("@plausible-analytics/tracker");
    writeAnalytics(
      model,
      ctx,
      "Plausible",
      [{ name: "PLAUSIBLE_DOMAIN", example: "" }],
      (env) => [
        "/** Plausible; off until the site's domain is set (see .env.example). Call it once. */",
        "export function initAnalytics() {",
        `  const domain = ${env["PLAUSIBLE_DOMAIN"]};`,
        "  if (!domain) return;",
        "  init({ domain });",
        "}",
      ],
      {
        imports: ['import { init } from "@plausible-analytics/tracker";'],
        readme: `Plausible starts once ${keys(ctx, ["PLAUSIBLE_DOMAIN"])} is set in \`.env\` (see \`.env.example\`) to the domain you added in Plausible, e.g. \`example.com\`. It doesn't count \`localhost\`.`,
      },
    );
  },
};

/** Umami's script tag; Umami tracks client-side navigations by itself. */
export const umami: Module = {
  id: "umami",
  name: "Umami",
  category: "analytics",
  description: {
    az: "Umami ilə sadə, açıq mənbəli analitika (Umami Cloud və ya öz serverin).",
    en: "Simple, open-source analytics with Umami (Umami Cloud or your own server).",
    ru: "Простая открытая аналитика Umami (Umami Cloud или ваш сервер).",
  },
  frameworks,
  apply(model, ctx) {
    writeAnalytics(
      model,
      ctx,
      "Umami",
      [
        { name: "UMAMI_WEBSITE_ID", example: "" },
        {
          name: "UMAMI_SCRIPT_URL",
          example: "https://cloud.umami.is/script.js",
        },
      ],
      (env) => [
        "/** Umami's tracker script; off until the website ID is set (see .env.example). */",
        "export function initAnalytics() {",
        `  const websiteId = ${env["UMAMI_WEBSITE_ID"]};`,
        `  const src = ${env["UMAMI_SCRIPT_URL"]};`,
        "  if (!websiteId || !src) return;",
        '  const script = document.createElement("script");',
        "  script.defer = true;",
        "  script.src = src;",
        "  script.dataset.websiteId = websiteId;",
        "  document.head.append(script);",
        "}",
      ],
      {
        readme: `Umami starts once ${keys(ctx, ["UMAMI_WEBSITE_ID"])} is set in \`.env\` (see \`.env.example\`) to the website ID from Umami. ${keys(ctx, ["UMAMI_SCRIPT_URL"])} points at Umami Cloud; change it for your own server.`,
      },
    );
  },
};
