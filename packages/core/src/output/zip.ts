import JSZip from "jszip";

/** Packs generated files under a top-level `<name>/` folder. */
export async function toZip(
  name: string,
  files: Map<string, string>,
): Promise<Uint8Array> {
  const zip = new JSZip();
  const folder = zip.folder(name);
  if (!folder) throw new Error("Could not create zip folder");
  for (const [path, content] of files) folder.file(path, content);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
