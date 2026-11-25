import { parseArgs } from "node:util";
import type { FrameworkId, Language, PackageManager } from "@stackforge/core";

/** What the command line fixed in advance; anything missing is asked (or defaulted with --yes). */
export interface CliArgs {
  name?: string;
  framework?: FrameworkId;
  language?: Language;
  packageManager?: PackageManager;
  modules?: string[];
  /** A preset id; its framework and modules fill whatever the flags leave open. */
  preset?: string;
  siteUrl?: string;
  yes: boolean;
  install: boolean;
  git: boolean;
  help: boolean;
  version: boolean;
  list: boolean;
}

const languages: readonly Language[] = ["ts", "js"];
const packageManagers: readonly PackageManager[] = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
];

function oneOf<T extends string>(
  flag: string,
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(
    `--${flag} must be one of: ${allowed.join(", ")} (got "${value}").`,
  );
}

/** Parses argv (without the node and script paths). Throws on unknown or invalid flags. */
export function parseCliArgs(argv: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      framework: { type: "string", short: "f" },
      language: { type: "string", short: "l" },
      pm: { type: "string" },
      modules: { type: "string", short: "m" },
      preset: { type: "string", short: "p" },
      "site-url": { type: "string" },
      yes: { type: "boolean", short: "y", default: false },
      install: { type: "boolean", default: true },
      git: { type: "boolean", default: true },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
      list: { type: "boolean", default: false },
    },
  });
  if (positionals.length > 1)
    throw new Error(`Expected one project name, got: ${positionals.join(" ")}`);

  return {
    name: positionals[0],
    // The framework list is checked against the registry later, with the other choices.
    framework: values.framework as FrameworkId | undefined,
    language: oneOf("language", values.language, languages),
    packageManager: oneOf("pm", values.pm, packageManagers),
    modules:
      values.modules === undefined
        ? undefined
        : values.modules
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
    preset: values.preset,
    siteUrl: values["site-url"],
    yes: values.yes,
    install: values.install,
    git: values.git,
    help: values.help,
    version: values.version,
    list: values.list,
  };
}

/** The package manager that started the CLI (`pnpm create` → pnpm), from npm_config_user_agent. */
export function detectPackageManager(
  userAgent: string | undefined,
): PackageManager {
  const name = userAgent?.split("/")[0];
  return packageManagers.find((pm) => pm === name) ?? "npm";
}

export const helpText = `Usage: create-pickstack [name] [options]

Options:
  -f, --framework <id>   react, vue, angular, svelte, solid, preact, next, nuxt, sveltekit, astro
  -l, --language <id>    ts (default) or js
  -m, --modules <ids>    comma-separated module ids (see --list)
  -p, --preset <id>      start from a ready stack (see --list)
      --pm <id>          npm, pnpm, yarn or bun (default: the one running this command)
      --site-url <url>   public origin for canonical URLs, sitemap and llms.txt
  -y, --yes              don't ask: use defaults for anything not given
      --no-install       skip installing dependencies
      --no-git           skip git init
      --list             list frameworks and modules
  -h, --help             show this help
  -v, --version          show the version

Examples:
  npm create pickstack@latest
  npm create pickstack@latest my-app -- --preset next-shadcn --yes
  pnpm create pickstack my-app --framework vue --modules tailwind,pinia,vue-router --yes`;
