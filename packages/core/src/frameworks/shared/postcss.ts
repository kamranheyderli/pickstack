import { file, jsLiteral } from "../../engine/code";
import type { ProjectModel } from "../../types";

/** Writes `postcss.config.mjs` from the plugins modules registered (Tailwind, Mantine). */
export function writePostcssConfig(model: ProjectModel): void {
  const plugins = Object.entries(model.bundler.postcss);
  if (!plugins.length) return;
  model.files.set(
    "postcss.config.mjs",
    file([
      "const config = {",
      "  plugins: {",
      ...plugins.map(
        ([name, options]) =>
          `    ${JSON.stringify(name)}: ${jsLiteral(options)},`,
      ),
      "  },",
      "};",
      "",
      "export default config;",
    ]),
  );
}
