import { isAbsolute, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  categoryOrder,
  frameworkCatalog,
  generate,
  getFramework,
  getPreset,
  installCommand,
  modules,
  presets,
  runCommand,
  singleSelectCategories,
  type FrameworkId,
  type Selection,
} from "@stackforge/core";
import { z } from "zod";
import { isFreeTarget, packageDirs, run, writeProject } from "./project";

const frameworkIds = frameworkCatalog
  .filter((f) => getFramework(f.id))
  .map((f) => f.id) as [FrameworkId, ...FrameworkId[]];

const text = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

const failure = (message: string) => ({ ...text(message), isError: true });

/** Everything a client can pick, optionally only what works with one framework. */
function catalog(framework?: FrameworkId) {
  const fits = (supported: FrameworkId[] | "all") =>
    !framework || supported === "all" || supported.includes(framework);
  return {
    frameworks: frameworkCatalog
      .filter((f) => getFramework(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        languages: getFramework(f.id)?.languages,
      })),
    presets: presets
      .filter((p) => !framework || p.framework === framework)
      .map((p) => ({
        id: p.id,
        name: p.name,
        framework: p.framework,
        modules: p.modules,
        description: p.description.en,
      })),
    categories: categoryOrder
      .map((category) => ({
        category,
        pickOne: singleSelectCategories.has(category),
        modules: modules
          .filter((m) => m.category === category && fits(m.frameworks))
          .map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description.en,
            frameworks: m.frameworks,
            ...(m.requires?.length ? { requires: m.requires } : {}),
            ...(m.conflicts?.length ? { conflicts: m.conflicts } : {}),
          })),
      }))
      .filter((c) => c.modules.length > 0),
  };
}

const selectionShape = {
  name: z
    .string()
    .describe(
      'Package and folder name: lowercase letters, digits, "-", "." or "_" (e.g. "my-app").',
    ),
  framework: z
    .enum(frameworkIds)
    .optional()
    .describe("Framework id. Optional when a preset is given."),
  preset: z
    .string()
    .optional()
    .describe(
      "Preset id from list_options; its framework and modules fill what isn't given.",
    ),
  modules: z
    .array(z.string())
    .optional()
    .describe(
      "Module ids from list_options. Overrides the preset's modules when given.",
    ),
  language: z.enum(["ts", "js"]).optional().describe("Defaults to ts."),
  packageManager: z
    .enum(["npm", "pnpm", "yarn", "bun"])
    .optional()
    .describe("Defaults to npm."),
  siteUrl: z
    .string()
    .optional()
    .describe("Public origin for canonical URLs, sitemap and llms.txt."),
};

type SelectionInput = {
  name: string;
  framework?: FrameworkId;
  preset?: string;
  modules?: string[];
  language?: "ts" | "js";
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  siteUrl?: string;
};

function toSelection(input: SelectionInput): Selection | string {
  const preset =
    input.preset === undefined ? undefined : getPreset(input.preset);
  if (input.preset !== undefined && !preset)
    return `Unknown preset "${input.preset}". Call list_options for the ids.`;
  const framework = input.framework ?? preset?.framework;
  if (!framework) return "Give a framework or a preset.";
  return {
    name: input.name,
    framework,
    language: input.language ?? "ts",
    packageManager: input.packageManager ?? "npm",
    siteUrl: input.siteUrl,
    modules: input.modules ?? preset?.modules ?? [],
  };
}

/**
 * The generator as an MCP server over stdio: `list_options` to discover choices,
 * `preview_project` to see what a selection produces, and `create_project` to write it.
 */
export async function startMcpServer(version: string): Promise<void> {
  const server = new McpServer({ name: "pickstack", version });

  server.registerTool(
    "list_options",
    {
      title: "List frameworks, presets and modules",
      description:
        "Lists the frameworks, ready-made presets and modules (by category, with the frameworks each supports and what it conflicts with). Pass a framework to see only what works with it. Categories marked pickOne allow one module.",
      inputSchema: { framework: z.enum(frameworkIds).optional() },
      annotations: { readOnlyHint: true },
    },
    ({ framework }) => text(catalog(framework)),
  );

  server.registerTool(
    "preview_project",
    {
      title: "Preview a project",
      description:
        "Generates a project in memory without writing anything and returns its file list, the modules that were added automatically and any warnings. Pass `file` to also get that file's content. Use it to check a selection before create_project.",
      inputSchema: {
        ...selectionShape,
        file: z.string().optional().describe("A path from the file list."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ file, ...input }) => {
      const selection = toSelection(input);
      if (typeof selection === "string") return failure(selection);
      const result = await generate(selection);
      if (!result.ok)
        return failure(result.errors.map((e) => e.message).join("\n"));
      return text({
        files: [...result.files.keys()].sort(),
        autoAdded: result.autoAdded,
        warnings: result.warnings,
        ...(file ? { [file]: result.files.get(file) ?? "(no such file)" } : {}),
      });
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create a project",
      description:
        "Writes a new project to <parentDirectory>/<name>. The target folder must not exist or must be empty. Optionally runs git init and installs dependencies. Returns the folder, the files written and the commands to start it.",
      inputSchema: {
        ...selectionShape,
        parentDirectory: z
          .string()
          .describe("Absolute path of the folder to create the project in."),
        git: z.boolean().optional().describe("Run git init (default true)."),
        install: z
          .boolean()
          .optional()
          .describe(
            "Install dependencies (default false; it can take a while).",
          ),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ parentDirectory, git = true, install = false, ...input }) => {
      if (!isAbsolute(parentDirectory))
        return failure("parentDirectory must be an absolute path.");
      const selection = toSelection(input);
      if (typeof selection === "string") return failure(selection);
      const dir = resolve(parentDirectory, selection.name);
      if (!isFreeTarget(dir))
        return failure(`${dir} already exists and is not empty.`);
      const result = await generate(selection);
      if (!result.ok)
        return failure(result.errors.map((e) => e.message).join("\n"));

      await writeProject(dir, result.files);
      const pm = selection.packageManager;
      const projects = packageDirs(result.files).map((p) =>
        p === "." ? dir : resolve(dir, p),
      );
      const notes: string[] = [];
      if (git) {
        // Before install: a Husky `prepare` script needs the repository.
        await run("git init -q", dir, true).catch(() =>
          notes.push("git init failed; is git installed?"),
        );
      }
      if (install) {
        for (const project of projects) {
          await run(installCommand(pm), project, true).catch((e: unknown) =>
            notes.push(`Install failed in ${project}: ${String(e)}`),
          );
        }
      }
      return text({
        directory: dir,
        files: [...result.files.keys()].sort(),
        autoAdded: result.autoAdded,
        warnings: result.warnings,
        notes,
        nextSteps: projects.map((p) =>
          [
            `cd ${p}`,
            ...(install ? [] : [installCommand(pm)]),
            runCommand(pm, "dev"),
          ].join(" && "),
        ),
      });
    },
  );

  await server.connect(new StdioServerTransport());
}
