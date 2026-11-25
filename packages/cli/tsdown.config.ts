import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "node",
  target: "node22",
  format: "esm",
  fixedExtension: false,
  deps: {
    // The generator is private to this repo, so it ships inside the CLI bundle;
    // its runtime dependencies (Prettier and friends) stay regular dependencies.
    alwaysBundle: ["@stackforge/core"],
  },
  treeshake: {
    // jszip only backs the web app's zip download; let the bundler drop it.
    moduleSideEffects: (id) => !id.includes("jszip"),
  },
});
