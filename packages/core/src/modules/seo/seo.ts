import { DEFAULT_SITE_URL } from "../../frameworks/shared/seo";
import type { Module } from "../../types";

export const seo: Module = {
  id: "seo",
  name: "SEO",
  category: "seo",
  description: {
    az: "Meta/OG teqləri, canonical, JSON-LD, robots.txt və sitemap.xml.",
    en: "Meta/OG tags, canonical URL, JSON-LD, robots.txt and sitemap.xml.",
    ru: "Meta/OG-теги, канонический URL, JSON-LD, robots.txt и sitemap.xml.",
  },
  frameworks: "all",
  order: 10,
  apply(model, ctx) {
    const siteUrl = (ctx.selection.siteUrl ?? DEFAULT_SITE_URL).replace(
      /\/+$/,
      "",
    );
    model.seo = {
      siteUrl,
      description: `${ctx.selection.name}: a web app.`,
      ai: false,
    };
    model.readme.stack.push("SEO");
  },
};
