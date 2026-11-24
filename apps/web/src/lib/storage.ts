/** Per-viewer preferences; storage can be unavailable (private mode), so failures are ignored. */
export function readPref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(`stackforge:${key}`);
    return allowed.find((a) => a === value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(`stackforge:${key}`, value);
  } catch {
    // ignore
  }
}
