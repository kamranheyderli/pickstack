import { json } from "../../engine/code";
import { frameworkCatalog } from "../../frameworks/catalog";
import type { Module } from "../../types";
import { DEPLOY_CONFLICTS, isSpa, needsSpaFallback } from "./shared";

/**
 * Vercel detects every framework here on its own; the only file a project can need is the
 * SPA rewrite, since Vercel's Vite preset doesn't send deep links to index.html. Angular's
 * preset has that fallback built in.
 */
export const vercel: Module = {
  id: "vercel",
  name: "Vercel",
  category: "deploy",
  description: {
    az: "Vercel-ə yayımlama: framework avtomatik tanınır.",
    en: "Deploy to Vercel; the framework is detected automatically.",
  },
  frameworks: "all",
  conflicts: DEPLOY_CONFLICTS,
  apply(model, ctx) {
    const rewrite =
      isSpa(ctx) &&
      ctx.selection.framework !== "angular" &&
      needsSpaFallback(model, ctx);
    if (rewrite) {
      model.files.set(
        "vercel.json",
        json({
          $schema: "https://openapi.vercel.sh/vercel.json",
          rewrites: [{ source: "/(.*)", destination: "/index.html" }],
        }),
      );
    }
    const name =
      frameworkCatalog.find((f) => f.id === ctx.selection.framework)?.name ??
      ctx.selection.framework;
    model.readme.sections.push({
      title: "Deploy to Vercel",
      body: [
        `Push the project to GitHub and import it at https://vercel.com/new. Vercel detects ${name} and needs no build settings.`,
        ...(rewrite
          ? [
              "",
              "`vercel.json` sends every path to `index.html`, so client-side routes work on reload.",
            ]
          : []),
        "",
        "Or deploy from the terminal with `npx vercel`.",
      ].join("\n"),
    });
  },
};
