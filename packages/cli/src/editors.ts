import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export type EditorId = "code" | "cursor" | "windsurf" | "zed";

export interface Editor {
  id: EditorId;
  name: string;
  /** The shell command the editor installs (VS Code: Shell Command: Install 'code' in PATH). */
  command: string;
  /** The macOS app, for when the shell command isn't installed. */
  macApp: string;
}

export const editors: readonly Editor[] = [
  {
    id: "code",
    name: "VS Code",
    command: "code",
    macApp: "Visual Studio Code",
  },
  { id: "cursor", name: "Cursor", command: "cursor", macApp: "Cursor" },
  { id: "windsurf", name: "Windsurf", command: "windsurf", macApp: "Windsurf" },
  { id: "zed", name: "Zed", command: "zed", macApp: "Zed" },
];

export const editorIds = editors.map((e) => e.id);

/** What the checks look at; tests pass their own. */
export interface Host {
  platform: NodeJS.Platform;
  path: string;
  home: string;
  exists: (file: string) => boolean;
}

export const realHost = (): Host => ({
  platform: process.platform,
  path: process.env["PATH"] ?? "",
  home: homedir(),
  exists: existsSync,
});

/** How to start an editor here: its command on PATH, or (macOS) `open -a` on its app. */
export type Launch = { command: string; args: string[] };

export function launchFor(
  editor: Editor,
  dir: string,
  host: Host,
): Launch | null {
  const names =
    host.platform === "win32"
      ? [`${editor.command}.cmd`, `${editor.command}.exe`]
      : [editor.command];
  for (const folder of host.path.split(delimiter).filter(Boolean))
    for (const name of names)
      if (host.exists(join(folder, name)))
        // Windows goes through the shell, which finds the .cmd itself (paths may have spaces).
        return {
          command:
            host.platform === "win32" ? editor.command : join(folder, name),
          args: [dir],
        };
  if (host.platform === "darwin") {
    const app = `${editor.macApp}.app`;
    for (const root of ["/Applications", join(host.home, "Applications")])
      if (host.exists(join(root, app)))
        return { command: "open", args: ["-a", editor.macApp, dir] };
  }
  return null;
}

/** Editors this machine can open a folder in, in the list's order. */
export function installedEditors(host: Host): Editor[] {
  return editors.filter((e) => launchFor(e, ".", host) !== null);
}

/** Starts the editor on `dir` and lets it outlive the CLI. False when it isn't installed. */
export function openInEditor(
  id: EditorId,
  dir: string,
  host = realHost(),
): boolean {
  const editor = editors.find((e) => e.id === id);
  const launch = editor && launchFor(editor, dir, host);
  if (!launch) return false;
  const child = spawn(launch.command, launch.args, {
    detached: true,
    stdio: "ignore",
    // Windows runs the editors' .cmd launchers through the shell.
    shell: host.platform === "win32",
  });
  child.on("error", () => {});
  child.unref();
  return true;
}
