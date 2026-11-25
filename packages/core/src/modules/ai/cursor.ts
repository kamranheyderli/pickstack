import { file, json } from "../../engine/code";
import type { FrameworkId, Module } from "../../types";
import { mcpServers } from "./guide";

/** Files a framework's rule applies to (Cursor `globs`). */
const frameworkGlobs: Record<FrameworkId, string> = {
  react: "src/**/*.{ts,tsx,js,jsx}",
  preact: "src/**/*.{ts,tsx,js,jsx}",
  solid: "src/**/*.{ts,tsx,js,jsx}",
  next: "{app,components,lib}/**/*.{ts,tsx,js,jsx}",
  vue: "src/**/*.{vue,ts,js}",
  nuxt: "app/**/*.{vue,ts,js}",
  svelte: "src/**/*.{svelte,ts,js}",
  sveltekit: "src/**/*.{svelte,ts,js}",
  astro: "src/**/*.{astro,ts,js}",
  angular: "src/**/*.{ts,html}",
};

/**
 * Cursor reads AGENTS.md itself; this adds a project rule that points at it for the source
 * files (`.mdc` with `globs`) and the stack's MCP servers in `.cursor/mcp.json`.
 */
export const cursor: Module = {
  id: "cursor",
  name: "Cursor",
  category: "ai",
  description: {
    az: "Cursor layihə qaydası və stack-ə uyğun MCP serverləri.",
    en: "A Cursor project rule and MCP servers for your stack.",
  },
  frameworks: "all",
  requires: ["agents-md"],
  order: 30,
  apply(model, ctx) {
    model.repoFiles.set(
      `.cursor/rules/${ctx.selection.framework}.mdc`,
      file([
        "---",
        "description: Project structure, conventions and checks for source files",
        // Quoted: a glob starting with `{` would otherwise be read as a YAML mapping.
        `globs: "${frameworkGlobs[ctx.selection.framework]}"`,
        "alwaysApply: false",
        "---",
        "",
        "Follow the structure, conventions and checks in AGENTS.md at the repository root.",
      ]),
    );
    const servers = mcpServers(ctx);
    if (Object.keys(servers).length) {
      model.repoFiles.set(".cursor/mcp.json", json({ mcpServers: servers }));
    }
  },
};
