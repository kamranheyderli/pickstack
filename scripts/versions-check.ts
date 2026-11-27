/**
 * Compares every known-good range (packages/core/src/versions/known-good.ts) with the latest
 * release on npm and lists the packages whose latest version falls outside their range: those
 * need a deliberate bump and a smoke run. Updates inside a range reach projects on install.
 *
 *   pnpm versions:check            print the list
 *   pnpm versions:check --markdown the same as a Markdown table (the weekly CI job posts it)
 */
import { knownGoodRanges } from "../packages/core/src";
import { inRange } from "./semver-range";

async function latest(pkg: string): Promise<string | null> {
  const response = await fetch(
    `https://registry.npmjs.org/${pkg.replace("/", "%2F")}/latest`,
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { version?: string };
  return body.version ?? null;
}

async function main(): Promise<void> {
  const markdown = process.argv.includes("--markdown");
  const ranges = knownGoodRanges();
  const unique = [...new Set(ranges.map((r) => r.pkg))];
  const latestByPkg = new Map<string, string | null>();
  // A few requests at a time keeps the registry happy.
  for (let i = 0; i < unique.length; i += 8) {
    const batch = unique.slice(i, i + 8);
    const versions = await Promise.all(batch.map(latest));
    batch.forEach((pkg, j) => latestByPkg.set(pkg, versions[j] ?? null));
  }

  const behind = ranges
    .map((r) => ({ ...r, latest: latestByPkg.get(r.pkg) ?? null }))
    .filter((r) => r.latest !== null && !inRange(r.latest, r.range));

  if (markdown) {
    console.log(`## Known-good versions behind npm (${behind.length})\n`);
    if (!behind.length)
      return console.log("Every range covers npm's latest release.");
    console.log("| Package | Scope | Range | Latest |\n|---|---|---|---|");
    for (const r of behind)
      console.log(
        `| \`${r.pkg}\` | ${r.scope} | \`${r.range}\` | \`${r.latest}\` |`,
      );
    return;
  }
  console.log(
    `${unique.length} packages checked, ${behind.length} ranges behind npm's latest.`,
  );
  for (const r of behind)
    console.log(
      `  ${r.pkg.padEnd(36)} ${r.scope.padEnd(10)} ${r.range.padEnd(12)} → ${r.latest}`,
    );
}

void main();
