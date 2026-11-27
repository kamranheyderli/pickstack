import { frameworkNames, moduleNames, presetStacks } from "./_stack-names.js";

export interface SharedStack {
  framework: string;
  frameworkName: string;
  language: "ts" | "js";
  /** Module ids the link names that exist, in the link's order. */
  modules: string[];
}

/**
 * The stack a share link describes, read the way the site reads it: `?p=<preset>` starts from
 * a preset, `f`, `l` and `m` override it. Unknown ids are dropped; null without a framework.
 */
export function stackFromQuery(params: URLSearchParams): SharedStack | null {
  const preset = presetStacks[params.get("p") ?? ""];
  const framework = params.get("f") ?? preset?.framework ?? "";
  const frameworkName = frameworkNames[framework];
  if (!frameworkName) return null;
  const listed = params.get("m");
  const ids = listed === null ? (preset?.modules ?? []) : listed.split(",");
  return {
    framework,
    frameworkName,
    language: params.get("l") === "js" ? "js" : "ts",
    modules: ids.map((id) => id.trim()).filter((id) => id in moduleNames),
  };
}

export const moduleName = (id: string): string => moduleNames[id] ?? id;

/** "React + Tailwind CSS, shadcn/ui, Zustand +3": the stack in one line. */
export function stackTitle(stack: SharedStack, shown = 3): string {
  const names = stack.modules.slice(0, shown).map(moduleName);
  const more = stack.modules.length - names.length;
  return [
    stack.frameworkName,
    names.length ? ` + ${names.join(", ")}` : "",
    more > 0 ? ` +${more}` : "",
  ].join("");
}
