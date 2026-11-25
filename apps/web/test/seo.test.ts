import { describe, expect, it } from "vitest";
import { stackPages } from "../seo/pages";
import { escape, renderIndex, renderPage, sitemap } from "../seo/render";

const pages = await stackPages();
const fakeHighlight = async () => null;

describe("SEO pages", () => {
  it("cover every framework, its modules and the presets, with unique paths", () => {
    const paths = pages.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/stacks/react/");
    expect(paths).toContain("/stacks/react/tanstack-query/");
    expect(paths).toContain("/stacks/vue/pinia/");
    expect(paths).toContain("/stacks/presets/next-shadcn/");
    // Modules only appear under frameworks that support them.
    expect(paths).not.toContain("/stacks/react/pinia/");
    expect(pages.length).toBeGreaterThan(250);
  });

  it("keep titles and descriptions within search snippet limits", () => {
    for (const page of pages) {
      expect(page.title.length).toBeLessThanOrEqual(70);
      expect(page.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("show what a module adds over the bare framework", () => {
    const page = pages.find((p) => p.path === "/stacks/react/tanstack-query/");
    expect(page?.packages.map((p) => p.name)).toEqual([
      "@tanstack/react-query",
    ]);
    expect(page?.added.map((f) => f.path)).toContain("src/api/stack.ts");
    expect(page?.command).toBe(
      "npm create pickstack@latest my-app -- --framework react --modules tanstack-query --yes",
    );
  });

  it("render canonical URLs, structured data and escaped text", async () => {
    const page = pages.find((p) => p.path === "/stacks/react/tanstack-query/");
    if (!page) throw new Error("missing page");
    const html = await renderPage(page, "https://example.dev", fakeHighlight);
    expect(html).toContain(
      '<link rel="canonical" href="https://example.dev/stacks/react/tanstack-query/">',
    );
    expect(html).toContain('"@type":"HowTo"');
    expect(html).not.toContain("</script><script");
    expect(escape('<a href="x">&</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;",
    );
    expect(renderIndex(pages, "https://example.dev")).toContain(
      'href="/stacks/vue/pinia/"',
    );
  });

  it("list every page in the sitemap", () => {
    const xml = sitemap(["/", "/stacks/"], "https://example.dev", "2026-11-26");
    expect(xml).toContain("<loc>https://example.dev/stacks/</loc>");
    expect(xml).toContain("<lastmod>2026-11-26</lastmod>");
  });
});
