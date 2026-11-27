import type { Locale } from "../i18n";
import sizes from "../data/bundle-sizes.json";

interface FrameworkSizes {
  /** The minimal project's client JavaScript, in gzip bytes. */
  base: number;
  /** What each module adds on top of the modules it needs. */
  modules: Record<string, number>;
}

/** Measured by `pnpm bundle-size` (scripts/bundle-size.ts), which builds every pair. */
const frameworks: Partial<Record<string, FrameworkSizes>> = sizes.frameworks;

/** What `id` adds to a `framework` project, or undefined when it wasn't measured. */
export function moduleSize(framework: string, id: string): number | undefined {
  return frameworks[framework]?.modules[id];
}

/**
 * The stack's client JavaScript: the framework's minimal project plus every module in it
 * (picked or pulled in). Undefined while any of them is unmeasured, rather than a low guess.
 */
export function stackSize(
  framework: string,
  modules: readonly string[],
): number | undefined {
  const fw = frameworks[framework];
  if (!fw) return undefined;
  let total = fw.base;
  for (const id of new Set(modules)) {
    const size = fw.modules[id];
    if (size === undefined) return undefined;
    total += size;
  }
  return total;
}

/** "84 KB", or "8.4 KB" under 10 KB ("0 KB" for none), in the locale's number format. */
export function formatSize(bytes: number, locale: Locale): string {
  const kb = bytes / 1024;
  const digits = kb > 0 && kb < 10 ? 1 : 0;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(kb)} KB`;
}
