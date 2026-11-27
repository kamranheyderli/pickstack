import { generate, type Selection } from "@stackforge/core";
import { describe, expect, it } from "vitest";
import { runGuide } from "../src/lib/runSteps";

async function files(selection: Selection) {
  const result = await generate(selection);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.files;
}

const base: Selection = {
  name: "shop",
  framework: "react",
  language: "ts",
  packageManager: "pnpm",
  modules: ["tailwind"],
};

describe("runGuide", () => {
  it("unzips, installs and starts a single project", async () => {
    const guide = runGuide(await files(base), base, "shop", { kind: "zip" });
    expect(guide.steps.map((s) => s.commands)).toEqual([
      ["unzip shop.zip", "cd shop"],
      ["pnpm install", "pnpm dev"],
    ]);
    expect(guide.url).toBe("http://localhost:5173");
    expect(guide.needsSecret).toBe(false);
  });

  it("starts the database, the API and then the app for a full-stack project", async () => {
    const selection = {
      ...base,
      modules: ["express", "drizzle", "better-auth"],
    };
    const guide = runGuide(await files(selection), selection, "shop", {
      kind: "zip",
    });
    expect(guide.steps.map((s) => s.label)).toEqual([
      "run.unzip",
      "run.database",
      "run.api",
      "run.app",
    ]);
    expect(guide.steps[2]?.commands).toEqual([
      "cd server",
      "cp .env.example .env",
      "pnpm install",
      "pnpm db:push",
      "pnpm dev",
    ]);
    expect(guide.steps[3]?.commands).toEqual([
      "cd shop/web",
      "pnpm install",
      "pnpm dev",
    ]);
    expect(guide.needsSecret).toBe(true);
  });

  it("clones a new repository and uses the framework's dev port", async () => {
    const selection: Selection = { ...base, framework: "angular", modules: [] };
    const guide = runGuide(await files(selection), selection, "shop", {
      kind: "clone",
      url: "https://github.com/me/shop",
    });
    expect(guide.steps[0]?.commands).toEqual([
      "git clone https://github.com/me/shop",
      "cd shop",
    ]);
    expect(guide.url).toBe("http://localhost:4200");
  });
});
