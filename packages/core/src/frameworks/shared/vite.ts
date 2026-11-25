import { file, indent, renderImports } from "../../engine/code";
import type { Ctx, ImportSpec, ProjectModel } from "../../types";
import { testBlock, vitestReference } from "./testing";

/**
 * `vite.config` with the model's plugins, `extra` top-level options and, when the `vitest`
 * module is selected, the `test` block.
 */
/** `server.proxy` sending `/api` to the backend in development, when there is one. */
export function proxyBlock(model: ProjectModel): string[] {
  return model.apiProxy
    ? [`server: { proxy: { "/api": "${model.apiProxy}" } },`]
    : [];
}

export function plainViteConfig(
  model: ProjectModel,
  ctx: Ctx,
  extra: string[] = [],
  extraImports: ImportSpec[] = [],
): string {
  const plugins = model.bundler.plugins;
  const testing = model.testing;
  return file([
    ...(testing ? vitestReference(ctx) : []),
    ...renderImports([
      { from: "vite", named: ["defineConfig"] },
      ...plugins.map((p) => p.import),
      ...extraImports,
    ]),
    "",
    "export default defineConfig({",
    `  plugins: [${plugins.map((p) => p.call).join(", ")}],`,
    ...indent(extra),
    ...indent(proxyBlock(model)),
    ...(testing ? indent(testBlock(testing)) : []),
    "});",
  ]);
}
