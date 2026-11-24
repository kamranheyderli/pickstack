import type { HighlighterCore } from "shiki/core";

const languages: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
};

let highlighter: Promise<HighlighterCore> | null = null;

function load(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
      await Promise.all([
        import("shiki/core"),
        import("shiki/engine/javascript"),
      ]);
    return createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [import("shiki/themes/vitesse-dark.mjs")],
      langs: [
        import("shiki/langs/typescript.mjs"),
        import("shiki/langs/tsx.mjs"),
        import("shiki/langs/javascript.mjs"),
        import("shiki/langs/jsx.mjs"),
        import("shiki/langs/json.mjs"),
        import("shiki/langs/css.mjs"),
        import("shiki/langs/html.mjs"),
        import("shiki/langs/markdown.mjs"),
      ],
    });
  })();
  return highlighter;
}

export function languageFor(path: string): string | null {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (name === ".prettierrc") return "json";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? (languages[name.slice(dot + 1)] ?? null) : null;
}

/** Returns highlighted HTML, or `null` for file types without a grammar. */
export async function highlight(
  code: string,
  path: string,
): Promise<string | null> {
  const lang = languageFor(path);
  if (!lang) return null;
  const core = await load();
  return core.codeToHtml(code, { lang, theme: "vitesse-dark" });
}
