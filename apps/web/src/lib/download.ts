
export async function downloadZip(
  name: string,
  files: Map<string, string>,
): Promise<string> {
  // Loaded on click: the ZIP writer isn't needed before someone downloads.
  const { toZip } = await import("@stackforge/core/zip");
  const bytes = await toZip(name, files);
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: "application/zip" }),
  );
  const filename = `${name}.zip`;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return filename;
}
