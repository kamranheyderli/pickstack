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

/** The typescript-starter's config: decorators need `emitDecoratorMetadata`. */
const nestTsconfig = json({
  compilerOptions: {
    module: "nodenext",
    moduleResolution: "nodenext",
    resolvePackageJsonExports: true,
    esModuleInterop: true,
    isolatedModules: true,
    declaration: true,
    removeComments: true,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    importHelpers: true,
    allowSyntheticDefaultImports: true,
    target: "ES2023",
    sourceMap: true,
    outDir: "./dist",
    incremental: true,
    skipLibCheck: true,
    strict: true,
    strictPropertyInitialization: false,
    types: ["node"],
  },
});

function scripts(spec: ServerSpec, ctx: Ctx): Record<string, string> {
  if (spec.kind === "nestjs") {
    return {
      dev: "nest start --watch",
      build: "nest build",
      start: "node dist/main",
      typecheck: "tsc --noEmit",
    };
  }
  return ctx.isTs
    ? {
        dev: "tsx watch src/index.ts",
        build: "tsc",
        start: "node dist/index.js",
        typecheck: "tsc --noEmit",
      }
    : { dev: "node --watch src/index.js", start: "node src/index.js" };
}

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
    scripts: { ...scripts(spec, ctx), ...spec.scripts },
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

/** Nest's entry: every route is served under `/api`, which the app's dev server proxies. */
const nestMain = (spec: ServerSpec) =>
  file([
    'import { NestFactory } from "@nestjs/core";',
    'import { AppModule } from "./app.module.js";',
    "",
    "async function bootstrap() {",
    "  const app = await NestFactory.create(AppModule);",
    '  app.setGlobalPrefix("api");',
    `  const port = Number(process.env.PORT ?? ${spec.port});`,
    "  await app.listen(port);",
    "  console.log(`API listening on http://localhost:${port}`);",
    "}",
    "await bootstrap();",
  ]);

const nestAppModule = (spec: ServerSpec) =>
  file([
    ...renderImports([
      { from: "@nestjs/common", named: ["Module"] },
      { from: "./app.controller.js", named: ["AppController"] },
      { from: "./app.service.js", named: ["AppService"] },
      ...spec.appImports,
    ]),
    "",
    "@Module({",
    ...(spec.appModules.length
      ? ["  imports: [", ...spec.appModules.map((m) => `    ${m},`), "  ],"]
      : []),
    "  controllers: [AppController],",
    "  providers: [AppService],",
    "})",
    "export class AppModule {}",
  ]);

const nestFiles = (spec: ServerSpec): [string, string][] => [
  [
    "nest-cli.json",
    json({
      $schema: "https://json.schemastore.org/nest-cli",
      collection: "@nestjs/schematics",
      sourceRoot: "src",
      compilerOptions: { deleteOutDir: true },
    }),
  ],
  ["tsconfig.json", nestTsconfig],
  [
    "tsconfig.build.json",
    json({
      extends: "./tsconfig.json",
      compilerOptions: { rootDir: "./src" },
      include: ["src"],
      exclude: ["node_modules", "test", "dist", "**/*spec.ts"],
    }),
  ],
  ["src/main.ts", nestMain(spec)],
  ["src/app.module.ts", nestAppModule(spec)],
  [
    "src/app.controller.ts",
    file([
      'import { Controller, Get, Query } from "@nestjs/common";',
      'import { AppService } from "./app.service.js";',
      "",
      "@Controller()",
      "export class AppController {",
      "  constructor(private readonly appService: AppService) {}",
      "",
      '  @Get("health")',
      "  health(): { ok: boolean } {",
      "    return { ok: true };",
      "  }",
      "",
      '  @Get("hello")',
      '  hello(@Query("name") name?: string): { message: string } {',
      '    return { message: this.appService.greet(name ?? "world") };',
      "  }",
      "}",
    ]),
  ],
  [
    "src/app.service.ts",
    file([
      'import { Injectable } from "@nestjs/common";',
      "",
      "@Injectable()",
      "export class AppService {",
      "  greet(name: string): string {",
      "    return `Hello, ${name}!`;",
      "  }",
      "}",
    ]),
  ],
];

/** The server project's files, relative to `server/`. */
export function renderServer(spec: ServerSpec, ctx: Ctx): Map<string, string> {
  const x = ctx.ext.script;
  const files = new Map<string, string>([
    ["package.json", packageJson(spec, ctx)],
    [
      ".env.example",
      file(Object.entries(spec.env).map(([k, v]) => `${k}=${v}`)),
    ],
    [".gitignore", file(["node_modules", "dist", ".env"])],
  ]);
  const own: [string, string][] =
    spec.kind === "nestjs"
      ? nestFiles(spec)
      : [
          [`src/app.${x}`, appFile(spec)],
          [`src/index.${x}`, indexFile(spec)],
          ...(ctx.isTs
            ? [["tsconfig.json", tsconfig] as [string, string]]
            : []),
        ];
  for (const [path, content] of [...own, ...spec.files])
    files.set(path, content);
  return files;
}
