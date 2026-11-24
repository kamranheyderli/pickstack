import { json } from "../../engine/code";
import type { ProjectModel } from "../../types";

/**
 * create-vite's split tsconfig (app + node), used by the Solid and Preact templates.
 * `jsx` carries the framework-specific JSX options.
 */
export function writeViteTsconfigs(
  model: ProjectModel,
  jsx: Record<string, unknown>,
): void {
  const linting = {
    noUnusedLocals: true,
    noUnusedParameters: true,
    erasableSyntaxOnly: true,
    noFallthroughCasesInSwitch: true,
  };
  model.files.set(
    "tsconfig.json",
    json({
      files: [],
      references: [
        { path: "./tsconfig.app.json" },
        { path: "./tsconfig.node.json" },
      ],
    }),
  );
  model.files.set(
    "tsconfig.app.json",
    json({
      compilerOptions: {
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
        target: "es2023",
        module: "esnext",
        lib: ["ES2023", "DOM"],
        types: ["vite/client"],
        allowArbitraryExtensions: true,
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        moduleDetection: "force",
        noEmit: true,
        ...jsx,
        ...linting,
      },
      include: ["src"],
    }),
  );
  model.files.set(
    "tsconfig.node.json",
    json({
      compilerOptions: {
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
        target: "es2023",
        lib: ["ES2023"],
        types: ["node"],
        skipLibCheck: true,
        module: "nodenext",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        moduleDetection: "force",
        noEmit: true,
        ...linting,
      },
      include: ["vite.config.ts"],
    }),
  );
}
