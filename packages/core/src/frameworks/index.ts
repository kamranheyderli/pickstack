import type { FrameworkAdapter, FrameworkId } from "../types";
import { reactAdapter } from "./react/adapter";

export const frameworks: readonly FrameworkAdapter[] = [reactAdapter];

const byId = new Map<string, FrameworkAdapter>(
  frameworks.map((f) => [f.id, f]),
);

export function getFramework(
  id: FrameworkId | string,
): FrameworkAdapter | undefined {
  return byId.get(id);
}
