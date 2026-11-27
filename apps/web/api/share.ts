import { stackFromQuery, stackTitle } from "./_stack.js";

/**
 * The site's page for link-preview bots (X, LinkedIn, Slack, Telegram…), which don't run the
 * app's JavaScript: the same index.html, with the title, description and image of the stack
 * the link describes. A Vercel routing rule sends only those bots here, and only for links
 * with a stack in the query; everyone else gets the static page from the CDN.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const page = await fetch(new URL("/index.html", url.origin));
  const html = await page.text();
  const stack = stackFromQuery(url.searchParams);
  if (!stack) return htmlResponse(html);

  const image = new URL("/api/og", url.origin);
  image.search = url.search;
  const shared = new URL("/", url.origin);
  shared.search = url.search;
  const title = `${stackTitle(stack)} · pickstack`;
  const description =
    "Open this stack in pickstack: see every generated file, then get it as a ZIP, a GitHub repo or one command.";

  return htmlResponse(
    setMeta(html, {
      "og:title": title,
      "og:description": description,
      "og:image": image.href,
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:url": shared.href,
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": image.href,
    }).replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`),
  );
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=86400",
    },
  });
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Sets each tag's content, replacing an existing `property=`/`name=` meta or adding one. */
function setMeta(html: string, tags: Record<string, string>): string {
  let out = html;
  for (const [key, value] of Object.entries(tags)) {
    const attr = key.startsWith("og:") ? "property" : "name";
    const tag = `<meta ${attr}="${key}" content="${escape(value)}" />`;
    const existing = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`);
    out = existing.test(out)
      ? out.replace(existing, tag)
      : out.replace("</head>", `    ${tag}\n  </head>`);
  }
  return out;
}
