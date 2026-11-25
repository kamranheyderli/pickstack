import {
  getFramework,
  getModule,
  getPreset,
  type Language,
  type PackageManager,
  type Selection,
} from "@stackforge/core";
import { pruneIncompatible } from "../state/selection";

const languages: readonly Language[] = ["ts", "js"];
const packageManagers: readonly PackageManager[] = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
];

/** Short query keys keep shared links readable: ?f=vue&m=tailwind,pinia */
export function selectionToQuery(selection: Selection): string {
  const params = new URLSearchParams();
  params.set("f", selection.framework);
  if (selection.language !== "ts") params.set("l", selection.language);
  if (selection.packageManager !== "npm")
    params.set("pm", selection.packageManager);
  if (selection.name !== "my-app") params.set("n", selection.name);
  if (selection.siteUrl) params.set("s", selection.siteUrl);
  if (selection.modules.length) params.set("m", selection.modules.join(","));
  // Commas are safe in a query; keeping them unescaped keeps the link readable.
  return `?${params.toString().replaceAll("%2C", ",")}`;
}

/**
 * Reads a selection from a shared link, falling back to `base` for anything missing or
 * invalid. `?p=<preset>` starts from a preset; the other keys refine it. Returns null when
 * the link carries no selection at all.
 */
export function selectionFromQuery(
  search: string,
  base: Selection,
): Selection | null {
  const params = new URLSearchParams(search);
  const preset = getPreset(params.get("p") ?? "");
  const framework = params.get("f") ?? preset?.framework;
  if (!framework || !getFramework(framework)) return null;

  const pick = <T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ) => allowed.find((a) => a === params.get(key)) ?? fallback;
  const modules = params.has("m")
    ? (params.get("m") ?? "").split(",").filter((id) => getModule(id))
    : (preset?.modules ?? []);

  return pruneIncompatible({
    name: params.get("n") || base.name,
    framework: framework as Selection["framework"],
    language: pick("l", languages, base.language),
    packageManager: pick("pm", packageManagers, base.packageManager),
    siteUrl: params.get("s") || undefined,
    modules,
  }).selection;
}
