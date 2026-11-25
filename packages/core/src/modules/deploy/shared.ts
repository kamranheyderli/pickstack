import type { Ctx, FrameworkId, ProjectModel } from "../../types";

/** Frameworks that build to plain files with one `index.html` for every route. */
const SPAS: ReadonlySet<FrameworkId> = new Set([
  "react",
  "vue",
  "svelte",
  "solid",
  "preact",
  "angular",
]);

/** Frameworks that run their own Node server after the build. */
export const SERVER_FRAMEWORKS: ReadonlySet<FrameworkId> = new Set([
  "next",
  "nuxt",
]);

/** Deploy files sit next to package.json, so they don't fit a workspace or two projects. */
export const DEPLOY_CONFLICTS = ["turborepo", "module-federation"];

export const isSpa = (ctx: Ctx) => SPAS.has(ctx.selection.framework);

/**
 * Whether the host must answer unknown paths with index.html: client-side routing, which
 * Angular always has and the other SPAs have with a router module.
 */
export const needsSpaFallback = (model: ProjectModel, ctx: Ctx) =>
  ctx.selection.framework === "angular" ||
  (isSpa(ctx) && model.routing !== null);

/** Where the static build lands (frameworks without a server). */
export function staticOutput(ctx: Ctx): string {
  switch (ctx.selection.framework) {
    case "angular":
      return `dist/${ctx.selection.name}/browser`;
    case "sveltekit":
      return "build";
    default:
      return "dist";
  }
}
