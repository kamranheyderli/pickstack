export type DiffLine =
  | { type: "same" | "add" | "del"; text: string }
  /** A run of unchanged lines left out between changes. */
  | { type: "skip"; count: number };

/** Lines of context kept around each change. */
const CONTEXT = 3;

/**
 * Line diff via a longest-common-subsequence table. Generated files are small (hundreds of
 * lines), so the quadratic table is cheap; long unchanged runs collapse to a `skip` marker.
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  // An empty text has no lines (a new or deleted file), not one empty line.
  const lines = (text: string) => (text === "" ? [] : text.split("\n"));
  const a = lines(before);
  const b = lines(after);
  // lcs[i][j] = length of the LCS of a[i..] and b[j..].
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const row = lcs[i] as number[];
      row[j] =
        a[i] === b[j]
          ? ((lcs[i + 1] as number[])[j + 1] as number) + 1
          : Math.max(
              (lcs[i + 1] as number[])[j] as number,
              row[j + 1] as number,
            );
    }
  }

  const full: { type: "same" | "add" | "del"; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      full.push({ type: "same", text: a[i] as string });
      i++;
      j++;
    } else if (
      j < b.length &&
      (i >= a.length ||
        ((lcs[i] as number[])[j + 1] as number) >=
          ((lcs[i + 1] as number[])[j] as number))
    ) {
      full.push({ type: "add", text: b[j] as string });
      j++;
    } else {
      full.push({ type: "del", text: a[i] as string });
      i++;
    }
  }

  // Keep CONTEXT lines around each change; fold the rest.
  const keep = full.map(() => false);
  full.forEach((line, index) => {
    if (line.type === "same") return;
    for (
      let k = Math.max(0, index - CONTEXT);
      k <= Math.min(full.length - 1, index + CONTEXT);
      k++
    )
      keep[k] = true;
  });
  const out: DiffLine[] = [];
  let skipped = 0;
  full.forEach((line, index) => {
    if (keep[index]) {
      if (skipped) out.push({ type: "skip", count: skipped });
      skipped = 0;
      out.push(line);
    } else skipped++;
  });
  if (skipped) out.push({ type: "skip", count: skipped });
  return out;
}

/** Added and removed line counts. */
export function diffStats(diff: DiffLine[]): {
  added: number;
  removed: number;
} {
  return {
    added: diff.filter((l) => l.type === "add").length,
    removed: diff.filter((l) => l.type === "del").length,
  };
}
