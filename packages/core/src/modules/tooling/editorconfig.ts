import { file } from "../../engine/code";
import type { Module } from "../../types";

/**
 * `.editorconfig` with the settings the generated code already follows (UTF-8, LF, two
 * spaces, final newline). Prettier and Biome read it too, and these values match their
 * defaults, so formatting doesn't change.
 */
export const editorconfig: Module = {
  id: "editorconfig",
  name: "EditorConfig",
  category: "tooling",
  description: {
    az: "Bütün redaktorlarda eyni girinti və sətir sonu.",
    en: "Same indentation and line endings in every editor.",
    ru: "Одинаковые отступы и окончания строк в любом редакторе.",
  },
  frameworks: "all",
  apply(model) {
    model.repoFiles.set(
      ".editorconfig",
      file([
        "root = true",
        "",
        "[*]",
        "charset = utf-8",
        "end_of_line = lf",
        "indent_style = space",
        "indent_size = 2",
        "insert_final_newline = true",
        "trim_trailing_whitespace = true",
        "",
        "# Two trailing spaces are a line break in Markdown.",
        "[*.md]",
        "trim_trailing_whitespace = false",
      ]),
    );
  },
};
