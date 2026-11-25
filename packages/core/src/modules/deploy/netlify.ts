import { file } from "../../engine/code";
import { runCommand } from "../../engine/finalize";
import type { Module } from "../../types";
import {
  DEPLOY_CONFLICTS,
  SERVER_FRAMEWORKS,
  needsSpaFallback,
  staticOutput,
} from "./shared";

/**
 * Netlify: `netlify.toml` with the build command, the output folder and (for client-side
 * routing) the index.html rewrite. Next.js and Nuxt need no file: Netlify applies their
 * adapters itself.
 */
export const netlify: Module = {
  id: "netlify",
  name: "Netlify",
  category: "deploy",
  description: {
    az: "Netlify-a deploy: build əmri və yönləndirmələr hazır.",
    en: "Deploy to Netlify with the build command and redirects set.",
  },
  frameworks: "all",
  conflicts: DEPLOY_CONFLICTS,
  apply(model, ctx) {
    const server = SERVER_FRAMEWORKS.has(ctx.selection.framework);
    if (!server) {
      const spa = needsSpaFallback(model, ctx);
      model.files.set(
        "netlify.toml",
        file([
          "[build]",
          `  command = "${runCommand(ctx.selection.packageManager, "build")}"`,
          `  publish = "${staticOutput(ctx)}"`,
          ...(spa
            ? [
                "",
                "# Client-side routes: serve index.html for paths that aren't files.",
                "[[redirects]]",
                '  from = "/*"',
                '  to = "/index.html"',
                "  status = 200",
              ]
            : []),
        ]),
      );
    }
    model.readme.sections.push({
      title: "Deploy to Netlify",
      body: [
        "Push the project to GitHub and import it at https://app.netlify.com/start.",
        server
          ? "Netlify detects the framework and sets up its server runtime; no config file is needed."
          : "`netlify.toml` sets the build command and the folder to publish.",
        "",
        "Or deploy from the terminal with `npx netlify-cli deploy`.",
      ].join("\n"),
    });
  },
};
