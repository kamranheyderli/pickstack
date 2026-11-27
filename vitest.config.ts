import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      "apps/*",
      // The repo's own tooling (smoke runner helpers, the version check).
      { test: { name: "scripts", include: ["scripts/**/*.test.ts"] } },
    ],
  },
});
