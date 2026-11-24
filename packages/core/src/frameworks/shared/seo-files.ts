import { file } from "../../engine/code";
import type { Ctx, ProjectModel, SeoSpec } from "../../types";
import {
  AI_TRAINING_BOTS,
  CONTENT_SIGNAL,
  llmsTxt,
  META_PAGES,
  robotsTxt,
  sitemapXml,
  sitePages,
} from "./seo";

/**
 * Writes robots.txt, sitemap.xml and (with AIO) llms.txt the way each framework serves them:
 * static files in public/ for client-rendered apps, prerendered routes in meta-frameworks
 * so the site URL can come from an env var. Runs after modules, before adapters render.
 */
export function writeSeoFiles(model: ProjectModel, ctx: Ctx): void {
  const seo = model.seo;
  if (!seo) return;
  switch (ctx.selection.framework) {
    case "next":
      return nextFiles(model, ctx, seo);
    case "nuxt":
      return nuxtFiles(model, ctx, seo);
    case "sveltekit":
      return sveltekitFiles(model, ctx, seo);
    case "astro":
      return astroFiles(model, ctx, seo);
    default:
      return staticFiles(model, ctx, seo);
  }
}

function staticFiles(model: ProjectModel, ctx: Ctx, seo: SeoSpec): void {
  const pages = sitePages(model);
  model.files.set(
    "public/robots.txt",
    robotsTxt(seo, `${seo.siteUrl}/sitemap.xml`),
  );
  model.files.set("public/sitemap.xml", sitemapXml(seo.siteUrl, pages));
  if (seo.ai)
    model.files.set("public/llms.txt", llmsTxt(ctx.selection.name, seo, pages));
  model.readme.sections.push({
    title: "SEO",
    body: [
      `Replace \`${seo.siteUrl}\` in \`index.html\` and \`public/\` with your domain.`,
      "This is a client-rendered app: crawlers that do not run JavaScript (social previews,",
      "most AI crawlers) only see the static tags in `index.html`. For per-page SEO use a",
      "meta-framework (Next.js, Nuxt, SvelteKit, Astro).",
    ].join(" "),
  });
}

/** Template literal source that rebuilds a text file at request/prerender time from `base`. */
function textTemplate(content: string, siteUrl: string, base: string): string {
  return content.replaceAll(siteUrl, `\${${base}}`).replaceAll("`", "\\`");
}

function nextFiles(model: ProjectModel, ctx: Ctx, seo: SeoSpec): void {
  const ext = ctx.ext.script;
  const ts = ctx.isTs;
  model.files.set(
    `lib/site.${ext}`,
    file([
      `export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "${seo.siteUrl}";`,
      `export const siteName = "${ctx.selection.name}";`,
      `export const siteDescription = "${seo.description}";`,
    ]),
  );
  model.files.set(
    `app/sitemap.${ext}`,
    file([
      ...(ts ? ['import type { MetadataRoute } from "next";'] : []),
      'import { siteUrl } from "@/lib/site";',
      "",
      `export default function sitemap()${ts ? ": MetadataRoute.Sitemap" : ""} {`,
      `  return [${META_PAGES.map((p) => `{ url: \`\${siteUrl}${p.path}\` }`).join(", ")}];`,
      "}",
    ]),
  );
  model.files.set(
    `app/robots.${ext}`,
    file([
      ...(ts ? ['import type { MetadataRoute } from "next";'] : []),
      'import { siteUrl } from "@/lib/site";',
      "",
      `export default function robots()${ts ? ": MetadataRoute.Robots" : ""} {`,
      "  return {",
      "    rules: [",
      seo.ai
        ? `      { userAgent: "*", allow: "/", other: { "Content-Signal": "${CONTENT_SIGNAL}" } },`
        : '      { userAgent: "*", allow: "/" },',
      ...(seo.ai
        ? [
            `      { userAgent: ${JSON.stringify(AI_TRAINING_BOTS)}, disallow: "/" },`,
          ]
        : []),
      "    ],",
      "    sitemap: `${siteUrl}/sitemap.xml`,",
      "  };",
      "}",
    ]),
  );
  if (seo.ai) {
    model.files.set(
      `app/llms.txt/route.${ext}`,
      file([
        'import { siteUrl } from "@/lib/site";',
        "",
        'export const dynamic = "force-static";',
        "",
        "export function GET() {",
        `  const body = \`${textTemplate(llmsTxt(ctx.selection.name, seo, META_PAGES), seo.siteUrl, "siteUrl")}\`;`,
        '  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });',
        "}",
      ]),
    );
  }
  readmeEnv(model, "NEXT_PUBLIC_SITE_URL", seo);
}

function nuxtFiles(model: ProjectModel, ctx: Ctx, seo: SeoSpec): void {
  const ext = ctx.ext.script;
  const routes = [
    "/robots.txt",
    "/sitemap.xml",
    ...(seo.ai ? ["/llms.txt"] : []),
  ];
  deepMerge(model.bundler.config, {
    app: {
      head: {
        htmlAttrs: { lang: "en" },
        titleTemplate: `%s | ${ctx.selection.name}`,
      },
    },
    runtimeConfig: { public: { siteUrl: seo.siteUrl } },
    nitro: { prerender: { routes } },
  });
  const route = (name: string, type: string, content: string) =>
    model.files.set(
      `server/routes/${name}.${ext}`,
      file([
        "export default defineEventHandler((event) => {",
        "  const { siteUrl } = useRuntimeConfig(event).public;",
        `  setHeader(event, "Content-Type", "${type}; charset=utf-8");`,
        `  return \`${textTemplate(content, seo.siteUrl, "siteUrl")}\`;`,
        "});",
      ]),
    );
  route(
    "robots.txt",
    "text/plain",
    robotsTxt(seo, `${seo.siteUrl}/sitemap.xml`),
  );
  route("sitemap.xml", "application/xml", sitemapXml(seo.siteUrl, META_PAGES));
  if (seo.ai)
    route(
      "llms.txt",
      "text/plain",
      llmsTxt(ctx.selection.name, seo, META_PAGES),
    );
  readmeEnv(model, "NUXT_PUBLIC_SITE_URL", seo);
}

function sveltekitFiles(model: ProjectModel, ctx: Ctx, seo: SeoSpec): void {
  const ext = ctx.ext.script;
  // The prerendered route replaces the scaffold's static/robots.txt (they would conflict).
  model.files.delete("static/robots.txt");
  // SvelteKit 3 declares env vars in src/env and exposes them through $app/env/*.
  model.files.set(
    `src/env.${ext}`,
    file([
      'import { defineEnvVars } from "@sveltejs/kit/env";',
      "",
      "export const variables = defineEnvVars({",
      "  SITE_URL: {",
      "    public: true,",
      "    static: true,",
      '    description: "Public origin of the site, without trailing slash",',
      `    schema: (value) => value ?? "${seo.siteUrl}",`,
      "  },",
      "});",
    ]),
  );
  const route = (name: string, type: string, content: string) =>
    model.files.set(
      `src/routes/${name}/+server.${ext}`,
      file([
        'import { SITE_URL } from "$app/env/public";',
        "",
        "export const prerender = true;",
        "",
        "export function GET() {",
        `  const body = \`${textTemplate(content, seo.siteUrl, "SITE_URL")}\`;`,
        `  return new Response(body, { headers: { "Content-Type": "${type}" } });`,
        "}",
      ]),
    );
  route(
    "robots.txt",
    "text/plain",
    robotsTxt(seo, `${seo.siteUrl}/sitemap.xml`),
  );
  route("sitemap.xml", "application/xml", sitemapXml(seo.siteUrl, META_PAGES));
  if (seo.ai)
    route(
      "llms.txt",
      "text/plain",
      llmsTxt(ctx.selection.name, seo, META_PAGES),
    );
  readmeEnv(model, "SITE_URL", seo);
}

function astroFiles(model: ProjectModel, ctx: Ctx, seo: SeoSpec): void {
  model.pkg.dependencies.add("@astrojs/sitemap");
  model.bundler.integrations.push({
    import: { from: "@astrojs/sitemap", default: "sitemap" },
    call: "sitemap()",
  });
  const ext = ctx.ext.script;
  const route = (name: string, content: string) =>
    model.files.set(
      `src/pages/${name}.${ext}`,
      file([
        ...(ctx.isTs ? ['import type { APIRoute } from "astro";', ""] : []),
        `export const GET${ctx.isTs ? ": APIRoute" : ""} = ({ site }) => {`,
        '  const siteUrl = (site?.href ?? "/").replace(/\\/$/, "");',
        `  return new Response(\`${textTemplate(content, seo.siteUrl, "siteUrl")}\`);`,
        "};",
      ]),
    );
  route("robots.txt", robotsTxt(seo, `${seo.siteUrl}/sitemap-index.xml`));
  if (seo.ai) route("llms.txt", llmsTxt(ctx.selection.name, seo, META_PAGES));
  readmeEnv(model, "SITE_URL", seo);
}

function readmeEnv(model: ProjectModel, key: string, seo: SeoSpec): void {
  model.readme.sections.push({
    title: "SEO",
    body: `Set \`${key}\` to your public origin (defaults to \`${seo.siteUrl}\`). It is used for canonical URLs, the sitemap${seo.ai ? ", robots.txt and llms.txt" : " and robots.txt"}.`,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Merges plain objects (arrays are concatenated) so modules can share config keys. */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (isRecord(current) && isRecord(value)) deepMerge(current, value);
    else if (Array.isArray(current) && Array.isArray(value))
      target[key] = [...current, ...value];
    else target[key] = value;
  }
}
