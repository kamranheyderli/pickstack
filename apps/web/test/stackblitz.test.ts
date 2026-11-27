import { describe, expect, it } from "vitest";
import { runnableProject } from "../src/lib/stackblitz";

describe("runnableProject", () => {
  it("opens the whole project when it has a root package.json", () => {
    const files = new Map([
      ["package.json", "{}"],
      ["src/App.tsx", "app"],
    ]);
    expect(runnableProject(files, "src/App.tsx")).toEqual({
      files: { "package.json": "{}", "src/App.tsx": "app" },
      folder: null,
      openFile: "src/App.tsx",
    });
  });

  it("opens web/ alone when the API lives in server/", () => {
    const files = new Map([
      ["README.md", "root"],
      ["docker-compose.yml", "db"],
      ["web/package.json", "{}"],
      ["web/src/App.tsx", "app"],
      ["server/package.json", "{}"],
      ["server/src/index.ts", "api"],
    ]);
    const project = runnableProject(files, "web/src/App.tsx");
    expect(project.folder).toBe("web");
    expect(project.files).toEqual({
      "package.json": "{}",
      "src/App.tsx": "app",
    });
    expect(project.openFile).toBe("src/App.tsx");
    // A file outside web/ falls back to package.json.
    expect(runnableProject(files, "server/src/index.ts").openFile).toBe(
      "package.json",
    );
  });

  it("opens the first project when there is no web/ (e.g. host and remote)", () => {
    const files = new Map([
      ["remote/package.json", "{}"],
      ["host/package.json", "{}"],
      ["host/src/main.ts", "m"],
    ]);
    const project = runnableProject(files, "host/src/main.ts");
    expect(project.folder).toBe("host");
    expect(Object.keys(project.files)).toEqual(["package.json", "src/main.ts"]);
  });
});
