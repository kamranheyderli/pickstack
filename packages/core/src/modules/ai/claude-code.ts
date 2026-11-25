import { file, json } from "../../engine/code";
import { installCommand, runCommand } from "../../engine/finalize";
import type { Ctx, Module, ProjectModel } from "../../types";
import {
  OUTWARD_SCRIPTS,
  agentScripts,
  checkScripts,
  mcpServers,
} from "./guide";

/** Prefix rules for a command (`Bash(pnpm test *)` also matches bare `pnpm test`). */
function commandRules(ctx: Ctx, model: ProjectModel): string[] {
  const pm = ctx.selection.packageManager;
  const rules = new Set<string>([`Bash(${installCommand(pm)})`]);
  for (const script of agentScripts(model)) {
    rules.add(`Bash(${runCommand(pm, script)} *)`);
    // `pnpm build` and `pnpm run build` are both common.
    if (pm !== "npm") rules.add(`Bash(${pm} run ${script} *)`);
  }
  if (ctx.has("shadcn")) rules.add("Bash(npx shadcn@latest add *)");
  if (ctx.has("shadcn-vue")) rules.add("Bash(npx shadcn-vue@latest add *)");
  if (ctx.has("shadcn-svelte"))
    rules.add("Bash(npx shadcn-svelte@latest add *)");
  if (ctx.selection.framework === "angular") {
    rules.add(`Bash(${runCommand(pm, "ng")} generate *)`);
  }
  return [...rules];
}

/**
 * Formats the file Claude just edited. A Node script instead of the docs' `jq` one-liner, so
 * it works wherever the project runs; it runs the formatter installed next to the file.
 */
function formatHook(ctx: Ctx): string {
  const args = ctx.has("biome")
    ? '["--no-install", "biome", "format", "--write", "--files-ignore-unknown=true", relative(root, file)]'
    : '["--no-install", "prettier", "--write", "--ignore-unknown", relative(root, file)]';
  return file([
    "// PostToolUse hook: formats the file Claude Code just wrote or edited.",
    'import { spawnSync } from "node:child_process";',
    'import { existsSync } from "node:fs";',
    'import { dirname, join, relative } from "node:path";',
    'import process from "node:process";',
    "",
    'let input = "";',
    "for await (const chunk of process.stdin) input += chunk;",
    "const file = JSON.parse(input).tool_input?.file_path;",
    "",
    "// Run the formatter from the package that owns the file, where its config lives,",
    "// with a path relative to it (Biome rejects absolute paths through symlinked dirs).",
    "let root = file ? dirname(file) : undefined;",
    'while (root && !existsSync(join(root, "package.json"))) {',
    "  const parent = dirname(root);",
    "  root = parent === root ? undefined : parent;",
    "}",
    "",
    "if (file && root) {",
    `  spawnSync("npx", ${args}, {`,
    "    cwd: root,",
    '    stdio: "ignore",',
    '    shell: process.platform === "win32",',
    "  });",
    "}",
  ]);
}

/**
 * Claude Code, ready to use: CLAUDE.md imports AGENTS.md (the docs' pattern, so the guide is
 * read once) and adds Claude-specific notes; `.claude/settings.json` lets Claude run the
 * project's own scripts, asks before pushing, keeps `.env` secrets out of reach and formats
 * edited files; `.mcp.json` adds the official MCP servers for the stack.
 */
export const claudeCode: Module = {
  id: "claude-code",
  name: "Claude Code",
  category: "ai",
  description: {
    az: "CLAUDE.md, icazələr, formatlama hook-u və stack-ə uyğun MCP serverləri.",
    en: "CLAUDE.md, permissions, a format hook and MCP servers for your stack.",
  },
  frameworks: "all",
  requires: ["agents-md"],
  order: 20,
  apply(model, ctx) {
    const pm = ctx.selection.packageManager;
    const checks = checkScripts(model);
    const servers = mcpServers(ctx);
    const formatter = ctx.has("biome") || ctx.has("prettier");

    model.repoFiles.set(
      "CLAUDE.md",
      file([
        "@AGENTS.md",
        "",
        "## Claude Code",
        "",
        ...(checks.length
          ? [
              `- After a change, run ${checks.map((s) => `\`${runCommand(pm, s)}\``).join(", ")} before reporting it done.`,
            ]
          : []),
        ...(formatter
          ? [
              "- Edited files are formatted automatically by a hook; don't reformat by hand.",
            ]
          : []),
        ...(Object.keys(servers).length
          ? [
              `- MCP servers for this stack are in \`.mcp.json\` (${Object.keys(servers).join(", ")}); prefer them over guessing APIs.`,
            ]
          : []),
        "- Keep secrets in `.env.local`; Claude is not allowed to read `.env` files.",
      ]),
    );

    model.repoFiles.set(
      ".claude/settings.json",
      json({
        $schema: "https://json.schemastore.org/claude-code-settings.json",
        permissions: {
          allow: commandRules(ctx, model),
          // Pushing and deploying reach outside the machine, so Claude asks first.
          ask: [
            "Bash(git push *)",
            ...Object.keys(model.pkg.scripts)
              .filter((s) => OUTWARD_SCRIPTS.has(s))
              .map(
                (s) => `Bash(${runCommand(ctx.selection.packageManager, s)} *)`,
              ),
          ],
          deny: ["Read(./.env)", "Read(./.env.local)", "Read(./.env.*.local)"],
        },
        ...(formatter
          ? {
              hooks: {
                PostToolUse: [
                  {
                    matcher: "Edit|Write",
                    hooks: [
                      {
                        type: "command",
                        command:
                          'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/format.mjs"',
                        timeout: 30,
                      },
                    ],
                  },
                ],
              },
            }
          : {}),
      }),
    );
    if (formatter) {
      model.repoFiles.set(".claude/hooks/format.mjs", formatHook(ctx));
    }
    if (Object.keys(servers).length) {
      model.repoFiles.set(".mcp.json", json({ mcpServers: servers }));
    }
    // Personal settings and memory stay out of the repository.
    model.gitignore.push(".claude/settings.local.json", "CLAUDE.local.md");
    model.readme.sections.push({
      title: "Claude Code",
      body: "`CLAUDE.md` (with `AGENTS.md`) describes the project, `.claude/settings.json` allows the project's scripts and formats edited files, and `.mcp.json` lists MCP servers for the stack (Claude Code asks before enabling them).",
    });
  },
};
