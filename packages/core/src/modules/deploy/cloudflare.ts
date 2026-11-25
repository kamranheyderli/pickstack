import { json } from "../../engine/code";
import { runCommand } from "../../engine/finalize";
import { deploy } from "../../versions/known-good";
import type { Module } from "../../types";
import { DEPLOY_CONFLICTS, isSpa, staticOutput } from "./shared";

/**
 * Cloudflare Workers with static assets (Cloudflare's recommended successor to Pages):
 * `wrangler.json` points at the build output, and `npm run deploy` builds and uploads it.
 * Next.js and Nuxt need a server adapter (OpenNext, Nitro's cloudflare preset), so they
 * aren't offered here.
 */
export const cloudflare: Module = {
  id: "cloudflare",
  name: "Cloudflare",
  category: "deploy",
  description: {
    az: "Cloudflare Workers-ə statik deploy (wrangler).",
    en: "Static deploy to Cloudflare Workers with wrangler.",
  },
  frameworks: [
    "react",
    "vue",
    "svelte",
    "solid",
    "preact",
    "angular",
    "sveltekit",
    "astro",
  ],
  conflicts: DEPLOY_CONFLICTS,
  apply(model, ctx) {
    const pm = ctx.selection.packageManager;
    model.pkg.devDependencies.add("wrangler");
    model.pkg.scripts["deploy"] =
      `${runCommand(pm, "build")} && wrangler deploy`;
    model.files.set(
      "wrangler.json",
      json({
        $schema: "node_modules/wrangler/config-schema.json",
        name: ctx.selection.name,
        compatibility_date: deploy.cloudflareCompatibilityDate,
        assets: {
          directory: `./${staticOutput(ctx)}/`,
          // SPAs answer every path with index.html; static sites serve their 404 page.
          not_found_handling: isSpa(ctx)
            ? "single-page-application"
            : "404-page",
        },
      }),
    );
    model.gitignore.push(".wrangler");
    model.readme.sections.push({
      title: "Deploy to Cloudflare",
      body: [
        `Run \`${runCommand(pm, "deploy")}\`: it builds the site and uploads it to Cloudflare Workers. The first run opens a browser to log in.`,
        "",
        "To deploy from GitHub instead, connect the repository in the Cloudflare dashboard (Workers & Pages → Create → Import a repository).",
      ].join("\n"),
    });
  },
};
