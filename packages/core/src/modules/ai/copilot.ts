import { file, json } from "../../engine/code";
import type { Module } from "../../types";
import { mcpServers } from "./guide";

/**
 * GitHub Copilot: repository instructions pointing at AGENTS.md (which Copilot's agent also
 * reads) and the stack's MCP servers for VS Code, whose `.vscode/mcp.json` uses `servers`.
 */
export const copilot: Module = {
  id: "copilot",
  name: "GitHub Copilot",
  category: "ai",
  description: {
    az: "Copilot təlimatları və VS Code üçün MCP server-lər.",
    en: "Copilot instructions and MCP servers for VS Code.",
  },
  frameworks: "all",
  requires: ["agents-md"],
  order: 40,
  apply(model, ctx) {
    model.repoFiles.set(
      ".github/copilot-instructions.md",
      file([
        `# ${ctx.selection.name}`,
        "",
        "Follow the commands, structure, conventions and checks in AGENTS.md at the repository root.",
      ]),
    );
    const servers = mcpServers(ctx);
    if (Object.keys(servers).length) {
      // VS Code expects an explicit transport type on every server.
      const vscode = Object.fromEntries(
        Object.entries(servers).map(([name, server]) => [
          name,
          { type: "stdio", ...server },
        ]),
      );
      model.repoFiles.set(".vscode/mcp.json", json({ servers: vscode }));
    }
  },
};
