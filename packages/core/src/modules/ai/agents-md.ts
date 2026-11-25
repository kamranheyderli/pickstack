import type { Module } from "../../types";
import { agentsMd } from "./guide";

/**
 * AGENTS.md (agents.md): one tool-neutral guide to this project that Codex, Cursor, Copilot's
 * agent, Gemini CLI, Claude Code and others read. The tool-specific modules build on it.
 */
export const agentsMdModule: Module = {
  id: "agents-md",
  name: "AGENTS.md",
  category: "ai",
  description: {
    az: "Bütün AI agentlərin oxuduğu layihə bələdçisi (əmrlər, struktur, qaydalar).",
    en: "Project guide every AI coding agent reads (commands, structure, rules).",
  },
  frameworks: "all",
  order: 10,
  apply(model, ctx) {
    model.repoFiles.set("AGENTS.md", agentsMd(model, ctx));
  },
};
