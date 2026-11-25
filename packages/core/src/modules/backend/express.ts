import { file, json, renderImports, sortRecord } from "../../engine/code";
import { runCommand } from "../../engine/finalize";
import { knownGoodVersion } from "../../versions/known-good";
import type { Ctx, Module } from "../../types";

/** The API's port; the app's dev server proxies `/api` here. */
export const SERVER_PORT = 3001;

function serverPackage(ctx: Ctx): string {
  const { name, framework } = ctx.selection;
  const versions = (names: string[]) =>
    sortRecord(
      Object.fromEntries(names.map((n) => [n, knownGoodVersion(n, framework)])),
    );
  return json({
    name: `${name}-server`,
    private: true,
    version: "0.1.0",
    type: "module",
    scripts: ctx.isTs
      ? {
          dev: "tsx watch src/index.ts",
          build: "tsc",
          start: "node dist/index.js",
          typecheck: "tsc --noEmit",
        }
      : {
          dev: "node --watch src/index.js",
          start: "node src/index.js",
        },
    dependencies: versions(["express"]),
    ...(ctx.isTs
      ? {
          devDependencies: versions([
            "@types/express",
            "@types/node",
            "tsx",
            "typescript",
          ]),
        }
      : {}),
    engines: { node: ">=22.12.0" },
  });
}

const tsconfig = json({
  compilerOptions: {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    rootDir: "src",
    outDir: "dist",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    verbatimModuleSyntax: true,
    types: ["node"],
  },
  include: ["src"],
});

/** `src/app`: the routes, separate from `listen` so tests can import the app. */
function appFile(): string {
  return file([
    ...renderImports([{ from: "express", default: "express" }]),
    "",
    "export const app = express();",
    "",
    "app.use(express.json());",
    "",
    'app.get("/api/health", (_req, res) => {',
    "  res.json({ ok: true });",
    "});",
    "",
    'app.get("/api/hello", (req, res) => {',
    '  const name = typeof req.query.name === "string" ? req.query.name : "world";',
    "  res.json({ message: `Hello, ${name}!` });",
    "});",
  ]);
}

function indexFile(): string {
  return file([
    ...renderImports([
      { from: "node:process", default: "process" },
      // Node's ESM resolution needs the extension; TS maps `.js` to the `.ts` source.
      { from: "./app.js", named: ["app"] },
    ]),
    "",
    `const port = Number(process.env.PORT ?? ${SERVER_PORT});`,
    "",
    "app.listen(port, () => {",
    "  console.log(`API listening on http://localhost:${port}`);",
    "});",
  ]);
}

/**
 * Express 5 API as its own project in `server/`, next to the app in `web/`: an app module with
 * JSON routes (`/api/health`, `/api/hello`) and an entry that listens on PORT (default 3001).
 * TS runs with `tsx watch` in development and compiles with `tsc`; JS uses `node --watch`.
 */
export const express: Module = {
  id: "express",
  name: "Express",
  category: "backend",
  description: {
    az: "Express 5 API ayrıca server/ layihəsində; /api frontend-dən proxy olunur.",
    en: "Express 5 API as its own server/ project; /api is proxied from the app.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "angular"],
  // A workspace or two front-end projects would need their own layout for the API.
  conflicts: ["turborepo", "module-federation"],
  apply(model, ctx) {
    const x = ctx.ext.script;
    const files = new Map<string, string>([
      ["package.json", serverPackage(ctx)],
      [`src/app.${x}`, appFile()],
      [`src/index.${x}`, indexFile()],
      [".env.example", file([`PORT=${SERVER_PORT}`])],
      [".gitignore", file(["node_modules", "dist", ".env"])],
    ]);
    if (ctx.isTs) files.set("tsconfig.json", tsconfig);
    model.server = {
      port: SERVER_PORT,
      files,
      summary: `Express 5 API on port ${SERVER_PORT}`,
    };
    model.readme.stack.push("Express");
    model.readme.sections.push({
      title: "API",
      body: `The API lives in \`../server\` (Express). Start it with \`${runCommand(ctx.selection.packageManager, "dev")}\` there; requests to \`/api\` from this app are proxied to it in development.`,
    });
  },
};
