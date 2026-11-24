import type { ProjectModel, SeoSpec } from "../../types";

/**
 * SEO/AIO content shared by every framework. Crawler tokens come from each vendor's docs
 * (2026-11): training crawlers are blocked, search/answer crawlers stay allowed.
 */
export const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
  "Bytespider",
];

/** Cloudflare Content Signals: allow search and answers, opt out of training. */
export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=no";

export interface SitePage {
  path: string;
  label: string;
}

export const DEFAULT_SITE_URL = "https://example.com";

export function robotsTxt(seo: SeoSpec, sitemapUrl: string): string {
  return [
    "User-agent: *",
    ...(seo.ai ? [`Content-Signal: ${CONTENT_SIGNAL}`] : []),
    "Allow: /",
    "",
    ...(seo.ai
      ? [
          ...AI_TRAINING_BOTS.map((bot) => `User-agent: ${bot}`),
          "Disallow: /",
          "",
        ]
      : []),
    `Sitemap: ${sitemapUrl}`,
    "",
  ].join("\n");
}

export function sitemapXml(siteUrl: string, pages: SitePage[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.flatMap((p) => [
      "  <url>",
      `    <loc>${siteUrl}${p.path}</loc>`,
      "  </url>",
    ]),
    "</urlset>",
    "",
  ].join("\n");
}

/** llms.txt per llmstxt.org: H1 name, blockquote summary, H2 sections of links. */
export function llmsTxt(name: string, seo: SeoSpec, pages: SitePage[]): string {
  return [
    `# ${name}`,
    "",
    `> ${seo.description}`,
    "",
    "## Pages",
    "",
    ...pages.map((p) => `- [${p.label}](${seo.siteUrl}${p.path})`),
    "",
    "## Optional",
    "",
    `- [Sitemap](${seo.siteUrl}/sitemap.xml)`,
    "",
  ].join("\n");
}

/** Pages to list: the router's routes, or just the home page for single-page apps. */
export function sitePages(model: ProjectModel): SitePage[] {
  return model.routes.length
    ? model.routes.map((r) => ({ path: r.path, label: r.label }))
    : [{ path: "/", label: "Home" }];
}

export const META_PAGES: SitePage[] = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
];

export function jsonLd(name: string, siteUrl: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: `${siteUrl}/`,
  });
}

/** Static head tags for client-rendered apps (index.html). Crawlers that skip JS see only these. */
export function staticHeadTags(name: string, seo: SeoSpec): string[] {
  const url = `${seo.siteUrl}/`;
  return [
    `<meta name="description" content="${seo.description}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${name}" />`,
    `<meta property="og:title" content="${name}" />`,
    `<meta property="og:description" content="${seo.description}" />`,
    `<meta property="og:url" content="${url}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<script type="application/ld+json">${jsonLd(name, seo.siteUrl)}</script>`,
  ];
}
