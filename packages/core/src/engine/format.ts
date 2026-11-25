import * as angular from "prettier/plugins/angular";
import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import * as html from "prettier/plugins/html";
import * as markdown from "prettier/plugins/markdown";
import * as postcss from "prettier/plugins/postcss";
import * as typescript from "prettier/plugins/typescript";
import { format } from "prettier/standalone";
import * as svelte from "prettier-plugin-svelte/browser";

const plugins = [
  angular,
  babel,
  estree,
  html,
  markdown,
  postcss,
  typescript,
  svelte,
];

/** Parser per file extension; `null` leaves the file untouched. */
export type ParserMap = Record<string, string | null>;

const defaultParsers: ParserMap = {
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
  ".vue": "vue",
  ".svelte": "svelte",
};

function extOf(path: string): string | undefined {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? undefined : base.slice(dot);
}

/**
 * Formats every file Prettier understands with default options; other files pass through.
 * `overrides` lets a framework change parsers, e.g. Angular templates use the `angular` parser.
 */
export async function formatFiles(
  files: Map<string, string>,
  overrides: ParserMap = {},
  verbatim: ReadonlySet<string> = new Set(),
): Promise<Map<string, string>> {
  const parsers = { ...defaultParsers, ...overrides };
  // Verbatim paths are app-relative; a workspace layout may have moved them into a folder.
  const isVerbatim = (path: string) =>
    [...verbatim].some((v) => path === v || path.endsWith(`/${v}`));
  const entries = await Promise.all(
    [...files].map(async ([path, content]) => {
      if (isVerbatim(path)) return [path, content] as const;
      const ext = extOf(path);
      // Prettier prints package.json like JSON.stringify (arrays always broken).
      const parser = path.endsWith("package.json")
        ? "json-stringify"
        : ext
          ? parsers[ext]
          : undefined;
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
