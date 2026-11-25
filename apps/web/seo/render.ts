import type { DiffLine } from "../src/lib/diff";
import { MAX_LINES, type StackPage } from "./pages";

export const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** The mark from public/logo.svg, inline so pages need no extra request. */
const LOGO = `<svg width="26" height="26" viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="pl" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#7c3aed"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#pl)"/><rect x="14" y="40" width="36" height="9" rx="3" fill="#fff" opacity=".55"/><rect x="14" y="28" width="26" height="9" rx="3" fill="#fff" opacity=".8"/><rect x="14" y="16" width="16" height="9" rx="3" fill="#fff"/><path d="m37 21 4 4 8-9" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export type Highlight = (code: string, path: string) => Promise<string | null>;

function clipLines(code: string): { code: string; cut: number } {
  const lines = code.split("\n");
  if (lines.length <= MAX_LINES) return { code, cut: 0 };
  return {
    code: lines.slice(0, MAX_LINES).join("\n"),
    cut: lines.length - MAX_LINES,
  };
}

async function codeBlock(path: string, content: string, highlight: Highlight) {
  const { code, cut } = clipLines(content);
  const html = (await highlight(code, path)) ?? `<pre>${escape(code)}</pre>`;
  return `<figure class="file"><figcaption>${escape(path)}</figcaption>${html}${
    cut ? `<p class="cut">… ${cut} more lines in the generated project</p>` : ""
  }</figure>`;
}

function diffBlock(path: string, diff: DiffLine[]) {
  const lines = diff
    .map((line) =>
      line.type === "skip"
        ? `<span class="skip">⋯ ${line.count} unchanged lines</span>`
        : `<span class="${line.type}"><i>${
            line.type === "add" ? "+" : line.type === "del" ? "−" : " "
          }</i>${escape(line.text) || " "}</span>`,
    )
    .join("");
  return `<figure class="file"><figcaption>${escape(path)} <small>(changed)</small></figcaption><pre class="diff">${lines}</pre></figure>`;
}

/**
 * How to start what was generated: one project, or (an API in `server/` next to `web/`,
 * micro-frontends) each project in its folder. The CLI installs every one of them.
 */
function startSteps(files: string[]) {
  const projects = files.includes("package.json")
    ? ["."]
    : files
        .filter((f) => /^[^/]+\/package\.json$/.test(f))
        .map((f) => f.slice(0, f.indexOf("/")))
        .sort((a, b) => (a === "server" ? -1 : b === "server" ? 1 : 0));
  return projects.map((project) => ({
    "@type": "HowToStep",
    name:
      project === "."
        ? "Start the dev server"
        : project === "server"
          ? "Start the API"
          : project === "web"
            ? "Start the app"
            : `Start ${project}/`,
    text: `cd my-app${project === "." ? "" : `/${project}`} && npm run dev`,
  }));
}

function jsonLd(page: StackPage, site: string): string {
  const url = `${site}${page.path}`;
  const graph = [
    {
      "@type": "HowTo",
      name: page.heading,
      description: page.description,
      url,
      tool: [{ "@type": "HowToTool", name: "Node.js 22.12 or later" }],
      step: [
        {
          "@type": "HowToStep",
          name: "Create the project",
          text: page.command,
        },
        ...startSteps(page.files),
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: page.breadcrumb.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.label,
        item: `${site}${crumb.path}`,
      })),
    },
  ];
  // `</` can't appear inside the script element.
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  }).replaceAll("</", "<\\/");
}

/** The shell around every static page: head tags, header and footer. */
export function layout(opts: {
  site: string;
  path: string;
  title: string;
  description: string;
  body: string;
  jsonLd?: string;
}): string {
  const url = `${opts.site}${opts.path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(opts.title)}</title>
<meta name="description" content="${escape(opts.description)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/logo.svg">
<meta name="theme-color" content="#7c3aed">
<meta property="og:type" content="website">
<meta property="og:site_name" content="pickstack">
<meta property="og:title" content="${escape(opts.title)}">
<meta property="og:description" content="${escape(opts.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${opts.site}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/stacks/style.css">
${opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : ""}
</head>
<body>
<header><a class="brand" href="/">${LOGO}<span>pickstack</span></a><nav><a href="/stacks/">Templates</a><a href="/">Configurator</a><a href="https://www.npmjs.com/package/create-pickstack">npm</a></nav></header>
<main>${opts.body}</main>
<footer>pickstack: pick a framework and tools, get a ready-to-run frontend project. <a href="/">Open the configurator</a></footer>
</body>
</html>
`;
}

export async function renderPage(
  page: StackPage,
  site: string,
  highlight: Highlight,
): Promise<string> {
  const crumbs = page.breadcrumb
    .map((c, i) =>
      i === page.breadcrumb.length - 1
        ? `<span aria-current="page">${escape(c.label)}</span>`
        : `<a href="${c.path}">${escape(c.label)}</a>`,
    )
    .join(" / ");
  const packages = page.packages.length
    ? `<h2>Packages${page.module ? " it adds" : ""}</h2><table><thead><tr><th>Package</th><th>Version</th><th>Type</th></tr></thead><tbody>${page.packages
        .map(
          (p) =>
            `<tr><td><a href="https://www.npmjs.com/package/${p.name}"><code>${escape(p.name)}</code></a></td><td><code>${escape(p.version)}</code></td><td>${p.dev ? "dev" : "runtime"}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : "";
  const added = page.added.length
    ? `<h2>New files</h2>${(
        await Promise.all(
          page.added.map((f) => codeBlock(f.path, f.content, highlight)),
        )
      ).join("")}`
    : "";
  const changed = page.changed.length
    ? `<h2>Changes to existing files</h2>${page.changed.map((f) => diffBlock(f.path, f.diff)).join("")}`
    : "";
  const related = page.related.length
    ? `<h2>Related templates</h2><ul class="related">${page.related
        .map((r) => `<li><a href="${r.path}">${escape(r.label)}</a></li>`)
        .join("")}</ul>`
    : "";

  const body = `<nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>
<h1>${escape(page.heading)}</h1>
<p class="lead">${escape(page.intro)}</p>
<div class="cta"><pre class="command"><b>$</b> ${escape(page.command)}</pre><a class="button" href="${page.configurator}">Customize in the configurator</a></div>
${packages}
${added}
${changed}
<h2>Project files</h2><ul class="files">${page.files.map((f) => `<li><code>${escape(f)}</code></li>`).join("")}</ul>
${related}`;
  return layout({
    site,
    path: page.path,
    title: page.title,
    description: page.description,
    body,
    jsonLd: jsonLd(page, site),
  });
}

/** `/stacks/`: every template, grouped by framework, then the presets. */
export function renderIndex(pages: StackPage[], site: string): string {
  const byFramework = new Map<string, StackPage[]>();
  for (const page of pages) {
    if (page.path.startsWith("/stacks/presets/")) continue;
    const list = byFramework.get(page.framework.name) ?? [];
    list.push(page);
    byFramework.set(page.framework.name, list);
  }
  const presets = pages.filter((p) => p.path.startsWith("/stacks/presets/"));
  const sections = [...byFramework]
    .map(
      ([name, list]) =>
        `<section><h2><a href="${list[0]?.path}">${escape(name)}</a></h2><ul class="related">${list
          .slice(1)
          .map(
            (p) =>
              `<li><a href="${p.path}">${escape(p.module?.name ?? p.heading)}</a></li>`,
          )
          .join("")}</ul></section>`,
    )
    .join("");
  const body = `<h1>Frontend starter templates</h1>
<p class="lead">${pages.length} tested templates: every supported framework, alone or with one module, plus ready-made stacks. Each page shows the exact files and package versions, with a one-line create command.</p>
<h2>Ready-made stacks</h2><ul class="related">${presets
    .map((p) => `<li><a href="${p.path}">${escape(p.heading)}</a></li>`)
    .join("")}</ul>
${sections}`;
  return layout({
    site,
    path: "/stacks/",
    title:
      "Frontend starter templates for React, Vue, Svelte, Angular, Next.js and more | pickstack",
    description:
      "Tested starter templates for 10 frontend frameworks with Tailwind, shadcn/ui, TanStack, Pinia, Vitest, Playwright, deploy configs and more. One command to create.",
    body,
  });
}

export function sitemap(
  paths: string[],
  site: string,
  lastmod: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${site}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
}

export const robots = (site: string) =>
  `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;

export const STYLE = `:root{color-scheme:light dark;--bg:#f7f7f8;--panel:#fff;--ink:#0b0b10;--muted:#64646f;--line:#e4e4ea;--accent:#6d28d9;--accent-ink:#fff;--code:#0c0c12;--code-ink:#e6e6ef}
@media (prefers-color-scheme:dark){:root{--bg:#08080b;--panel:#101015;--ink:#f3f3f6;--muted:#9b9ba8;--line:#24242d;--accent:#a78bfa;--accent-ink:#0b0b10}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--accent)}header,main,footer{max-width:960px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;color:var(--ink);font-weight:700;letter-spacing:-.03em;text-decoration:none;font-size:18px}
header nav{display:flex;gap:18px;font-size:14px}header nav a{color:var(--muted);text-decoration:none}header nav a:hover{color:var(--ink)}
.crumbs{margin:28px 0 8px;font-size:13px;color:var(--muted)}.crumbs a{color:var(--muted)}
h1{font-size:clamp(28px,5vw,44px);line-height:1.1;letter-spacing:-.03em;margin:0 0 12px}
h2{font-size:20px;letter-spacing:-.02em;margin:40px 0 12px}
.lead{color:var(--muted);font-size:18px;max-width:70ch}
.cta{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:24px 0}
pre{margin:0;overflow-x:auto;font:13px/1.65 ui-monospace,"SF Mono",Menlo,Consolas,monospace}
.command{flex:1 1 420px;background:var(--code);color:var(--code-ink);padding:14px 16px;border-radius:12px;white-space:pre-wrap;word-break:break-all}.command b{color:#34d399}
.button{display:inline-block;background:var(--accent);color:var(--accent-ink);padding:12px 16px;border-radius:10px;font-weight:600;text-decoration:none}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:500}
.file{margin:0 0 16px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--code)}
.file figcaption{padding:8px 14px;font:12px ui-monospace,Menlo,monospace;color:var(--code-ink);border-bottom:1px solid #ffffff1a}
.file figcaption small{color:#9b9ba8}.file pre{padding:14px 16px;background:transparent!important;color:var(--code-ink)}
.cut{margin:0;padding:0 16px 12px;font-size:12px;color:#9b9ba8}
.diff span{display:block}.diff i{display:inline-block;width:18px;font-style:normal;color:#ffffff4d;user-select:none}
.diff .add{background:#10b98126}.diff .add i{color:#34d399}.diff .del{background:#ef444426;color:#e6e6ef99}.diff .del i{color:#f87171}
.diff .skip{color:#9b9ba8;font-size:12px;padding:2px 0}
.files{columns:2 220px;padding-left:18px;font-size:14px}
.related{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}.related a{display:inline-block;border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:4px 12px;font-size:14px;text-decoration:none;color:var(--ink)}
.related a:hover{border-color:var(--accent)}
footer{margin-top:64px;padding:24px 20px 40px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
`;
