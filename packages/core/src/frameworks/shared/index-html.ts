import { fill } from "../../engine/code";
import type { Ctx, ProjectModel } from "../../types";
import { staticHeadTags } from "./seo";
import indexHtml from "./templates/index-html";

/** index.html for Vite SPAs, with static SEO tags when the seo module is selected. */
export function spaIndexHtml(
  model: ProjectModel,
  ctx: Ctx,
  mountId: string,
  entry: string,
): string {
  const head = model.seo
    ? staticHeadTags(ctx.selection.name, model.seo)
        .map((line) => `\n    ${line}`)
        .join("")
    : "";
  return fill(indexHtml, { name: ctx.selection.name, mountId, entry, head });
}
