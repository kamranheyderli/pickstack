import { knownGoodVersion } from "../versions/known-good";
import type { Ctx, ServerSpec } from "../types";
import { file, json, renderImports, sortRecord } from "./code";

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

function packageJson(spec: ServerSpec, ctx: Ctx): string {
  const { name, framework } = ctx.selection;
  const versions = (names: Set<string>) =>
    sortRecord(
      Object.fromEntries(
        [...names].map((n) => [n, knownGoodVersion(n, framework)]),
      ),
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
      : { dev: "node --watch src/index.js", start: "node src/index.js" },
    dependencies: versions(spec.dependencies),
    ...(spec.devDependencies.size
      ? { devDependencies: versions(spec.devDependencies) }
      : {}),
    engines: { node: ">=22.12.0" },
  });
}

/** `src/app`: the routes, separate from `listen` so tests can import the app. */
const appFile = (spec: ServerSpec) =>
  file([
    ...renderImports([
      { from: "express", default: "express" },
      ...spec.appImports,
    ]),
    "",
    "export const app = express();",
    "",
    "app.use(express.json());",
    "",
    ...spec.routes,
  ]);

const indexFile = (spec: ServerSpec) =>
  file([
    ...renderImports([
      { from: "node:process", default: "process" },
      // Node's ESM resolution needs the extension; TS maps `.js` to the `.ts` source.
      { from: "./app.js", named: ["app"] },
      ...spec.entryImports,
    ]),
    "",
    `const port = Number(process.env.PORT ?? ${spec.port});`,
    ...(spec.beforeListen.length ? ["", ...spec.beforeListen] : []),
    "",
    "app.listen(port, () => {",
    "  console.log(`API listening on http://localhost:${port}`);",
    "});",
  ]);

/** The server project's files, relative to `server/`. */
export function renderServer(spec: ServerSpec, ctx: Ctx): Map<string, string> {
  const x = ctx.ext.script;
  const files = new Map<string, string>([
    ["package.json", packageJson(spec, ctx)],
    [`src/app.${x}`, appFile(spec)],
    [`src/index.${x}`, indexFile(spec)],
    [
      ".env.example",
      file(Object.entries(spec.env).map(([k, v]) => `${k}=${v}`)),
    ],
    [".gitignore", file(["node_modules", "dist", ".env"])],
    ...spec.files,
  ]);
  if (ctx.isTs) files.set("tsconfig.json", tsconfig);
  return files;
}
