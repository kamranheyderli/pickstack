import { file, json } from "../../engine/code";
import type { Module } from "../../types";

export const prettier: Module = {
  id: "prettier",
  name: "Prettier",
  category: "quality",
  description: {
    az: "Kod formatlayıcı.",
    en: "Opinionated code formatter.",
  },
  frameworks: ["react"],
  conflicts: ["biome"],
  apply(model) {
    model.pkg.devDependencies.add("prettier");
    model.pkg.scripts["format"] = "prettier --write .";
    model.pkg.scripts["format:check"] = "prettier --check .";
    model.files.set(".prettierrc", json({}));
    model.files.set(".prettierignore", file(["dist", "pnpm-lock.yaml"]));
    model.readme.stack.push("Prettier");
  },
};
