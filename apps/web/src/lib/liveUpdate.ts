export type LiveUpdate =
  | { kind: "none" }
  | { kind: "embed" }
  | {
      kind: "diff";
      diff: { create: Record<string, string>; destroy: string[] };
    };

/**
 * How to bring a running preview from `shown` to `next`: nothing, the changed files (the dev
 * server hot-reloads them), or a fresh embed when there is nothing running yet or a
 * package.json changed, since new packages need an install.
 */
export function liveUpdate(
  shown: Readonly<Record<string, string>> | null,
  next: Readonly<Record<string, string>>,
): LiveUpdate {
  if (!shown) return { kind: "embed" };
  const create: Record<string, string> = {};
  for (const [path, content] of Object.entries(next))
    if (shown[path] !== content) create[path] = content;
  const destroy = Object.keys(shown).filter((path) => !(path in next));
  const changed = [...Object.keys(create), ...destroy];
  if (!changed.length) return { kind: "none" };
  if (changed.some((path) => path.split("/").at(-1) === "package.json"))
    return { kind: "embed" };
  return { kind: "diff", diff: { create, destroy } };
}
