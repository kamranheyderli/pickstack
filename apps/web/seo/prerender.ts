/**
 * Runs after `vite build`: writes the static template pages, sitemap.xml and robots.txt into
 * dist/, and gives the app's index.html absolute URLs for its share image and canonical link.
 *
 *   SITE_URL=https://pickstack.io tsx seo/prerender.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { highlight } from "../src/lib/highlight";
import { stackPages } from "./pages";
import { renderIndex, renderPage, robots, sitemap, STYLE } from "./render";

const site = (process.env.SITE_URL ?? "https://pickstack.io").replace(
  /\/$/,
  "",
);
const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

async function write(path: string, content: string) {
  const target = join(dist, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

const pages = await stackPages();
for (const page of pages) {
  await write(
    `${page.path}index.html`,
    await renderPage(page, site, highlight),
  );
}
await write("stacks/index.html", renderIndex(pages, site));
await write("stacks/style.css", STYLE);

const paths = ["/", "/stacks/", ...pages.map((p) => p.path)];
await write(
  "sitemap.xml",
  sitemap(paths, site, new Date().toISOString().slice(0, 10)),
);
await write("robots.txt", robots(site));

// The app shell: crawlers and link previews need absolute URLs.
const indexPath = join(dist, "index.html");
const index = await readFile(indexPath, "utf8");
await writeFile(
  indexPath,
  index
    .replace('content="/og.png"', `content="${site}/og.png"`)
    .replace(
      "</head>",
      `<link rel="canonical" href="${site}/">\n<meta property="og:url" content="${site}/">\n</head>`,
    ),
);

console.log(`Prerendered ${pages.length + 1} pages for ${site}`);
