import { file, indent, json } from "../../engine/code";
import { knownGoodVersion } from "../../versions/known-good";
import type {
  Ctx,
  FederationSpec,
  ImportedCall,
  ProjectModel,
} from "../../types";
import { demoClasses } from "./demo";
import { jsxCounter } from "./jsx";

/**
 * Module Federation with `@module-federation/vite` (the plugin Vite recommends): the app is the
 * host, `apps/remote` exposes `./Counter`. React is a shared singleton so hooks work across
 * the boundary. `dts: false`: the plugin's type sharing needs the remote running during
 * typecheck, so the host declares the remote module by hand instead.
 */

const SHARED = [
  "shared: {",
  "  react: { singleton: true },",
  '  "react-dom": { singleton: true },',
  "},",
];

const origin = (port: number) => `http://localhost:${port}`;

/** Fixed ports: the host loads the remote from a hard-coded URL. */
function serverOptions(port: number, extra = ""): string[] {
  return [
    `server: { port: ${port}, strictPort: true${extra} },`,
    `preview: { port: ${port}, strictPort: true },`,
  ];
}

/** `federation({...})` call: one object, one line per option. */
function federationCall(options: string[]): ImportedCall {
  return {
    import: { from: "@module-federation/vite", named: ["federation"] },
    call: ["federation({", ...indent(options), "})"].join("\n"),
  };
}

export function hostFederationPlugin(spec: FederationSpec): ImportedCall {
  return federationCall([
    'name: "host",',
    "dts: false,",
    "remotes: {",
    "  remote: {",
    '    type: "module",',
    '    name: "remote",',
    `    entry: "${origin(spec.remotePort)}/remoteEntry.js",`,
    "  },",
    "},",
    ...SHARED,
  ]);
}

/** Top-level vite.config options for the host. */
export function hostServerOptions(spec: FederationSpec): string[] {
  return serverOptions(spec.hostPort);
}

/** `remotes.d.ts`: the type of what the remote exposes, for the host's typecheck. */
export function remoteDeclarations(): string {
  return file([
    'declare module "remote/Counter" {',
    '  import type { ComponentType } from "react";',
    "",
    "  const Counter: ComponentType;",
    "  export default Counter;",
    "}",
  ]);
}

/**
 * The remote app: a Vite + React project exposing its Counter. It reuses the host's demo
 * classes, which the host stylesheet (or Tailwind scan of the host) already provides.
 */
export function remoteApp(
  model: ProjectModel,
  ctx: Ctx,
  spec: FederationSpec,
): Map<string, string> {
  const version = (name: string) => knownGoodVersion(name, "react");
  const x = ctx.ext.component;
  const remoteOrigin = origin(spec.remotePort);
  const files = new Map<string, string>();

  files.set(
    "package.json",
    json({
      name: "remote",
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: ctx.isTs ? "tsc --noEmit && vite build" : "vite build",
        preview: "vite preview",
        ...(ctx.isTs ? { typecheck: "tsc --noEmit" } : {}),
      },
      dependencies: {
        react: version("react"),
        "react-dom": version("react-dom"),
      },
      devDependencies: Object.fromEntries(
        [
          "@module-federation/vite",
          ...(ctx.isTs ? ["@types/react", "@types/react-dom"] : []),
          "@vitejs/plugin-react",
          ...(ctx.isTs ? ["typescript"] : []),
          "vite",
        ].map((name) => [name, version(name)]),
      ),
    }),
  );
  files.set(
    `vite.config.${ctx.ext.script}`,
    file([
      'import { federation } from "@module-federation/vite";',
      'import react from "@vitejs/plugin-react";',
      'import { defineConfig } from "vite";',
      "",
      "// Where this remote is served. Asset URLs resolve against it, so they keep working",
      "// when the host loads the remote; change it (and the host's remote entry) on deploy.",
      `const REMOTE_ORIGIN = "${remoteOrigin}";`,
      "",
      "export default defineConfig({",
      "  base: `${REMOTE_ORIGIN}/`,",
      ...indent(serverOptions(spec.remotePort, ", origin: REMOTE_ORIGIN")),
      "  plugins: [",
      "    react(),",
      "    federation({",
      ...indent(
        [
          'name: "remote",',
          'filename: "remoteEntry.js",',
          "manifest: true,",
          "dts: false,",
          "exposes: {",
          `  "./Counter": "./src/Counter.${x}",`,
          "},",
          ...SHARED,
        ],
        3,
      ),
      "    }),",
      "  ],",
      "});",
    ]),
  );
  if (ctx.isTs) {
    files.set(
      "tsconfig.json",
      json({
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          isolatedModules: true,
          verbatimModuleSyntax: true,
          types: ["vite/client"],
        },
        include: ["src", "vite.config.ts"],
      }),
    );
  }
  files.set(
    "index.html",
    file([
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      "    <title>remote</title>",
      "  </head>",
      "  <body>",
      '    <div id="root"></div>',
      `    <script type="module" src="/src/main.${x}"></script>`,
      "  </body>",
      "</html>",
    ]),
  );
  files.set(
    `src/main.${x}`,
    file([
      'import { StrictMode } from "react";',
      'import { createRoot } from "react-dom/client";',
      'import Counter from "./Counter";',
      "",
      "// Standalone page for working on the remote without the host.",
      `createRoot(document.getElementById("root")${ctx.isTs ? "!" : ""}).render(`,
      "  <StrictMode>",
      "    <Counter />",
      "  </StrictMode>,",
      ");",
    ]),
  );
  files.set(
    `src/Counter.${x}`,
    jsxCounter(
      {
        imports: [{ from: "react", named: ["useState"] }],
        setup: ["const [count, setCount] = useState(0);"],
        value: "count",
        increment: "() => setCount((n) => n + 1)",
        decrement: "() => setCount((n) => n - 1)",
      },
      demoClasses(model),
      "className",
    ),
  );
  files.set(".gitignore", file(["node_modules", "dist"]));
  return files;
}
