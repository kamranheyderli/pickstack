/** The small part of semver the version check needs: does a release fall in a ^ or ~ range? */
type Version = [number, number, number];

const parse = (text: string): Version | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(text);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

/** Whether `version` satisfies a `^x.y.z` or `~x.y.z` range (the forms known-good.ts uses). */
export function inRange(version: string, range: string): boolean {
  const v = parse(version);
  const base = parse(range.replace(/^[\^~]/, ""));
  if (!v || !base) return true; // tags, workspace: or exact pins aren't checked
  const [major, minor] = base;
  if (range.startsWith("~")) return v[0] === major && v[1] === minor;
  // Caret: same leftmost non-zero part.
  if (major > 0) return v[0] === major;
  if (minor > 0) return v[0] === 0 && v[1] === minor;
  return v[0] === 0 && v[1] === 0 && v[2] === base[2];
}
