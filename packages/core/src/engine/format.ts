import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import * as html from "prettier/plugins/html";
import * as markdown from "prettier/plugins/markdown";
import * as postcss from "prettier/plugins/postcss";
import * as typescript from "prettier/plugins/typescript";
import { format } from "prettier/standalone";

const plugins = [babel, estree, html, markdown, postcss, typescript];

const parsers: Record<string, string> = {
  ".js": "babel",
  ".jsx": "babel",
  ".mjs": "babel",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".json": "json",
  ".prettierrc": "json",
  ".css": "css",
  ".scss": "scss",
  ".html": "html",
  ".md": "markdown",
};

function parserFor(path: string): string | undefined {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? undefined : parsers[base.slice(dot)];
}

/** Formats every file Prettier understands with default options; other files pass through. */
export async function formatFiles(
  files: Map<string, string>,
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    [...files].map(async ([path, content]) => {
      const parser = parserFor(path);
      if (!parser) return [path, content] as const;
      const formatted = await format(content, {
        parser,
        plugins,
        filepath: path,
      });
      return [path, formatted] as const;
    }),
  );
  return new Map(entries);
}
