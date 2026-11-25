import type { Module } from "../../types";
import { connectApi, SERVER_PORT } from "./express";

/**
 * NestJS API as its own project in `server/`, following the official typescript-starter
 * (ESM, `nest build`), with a global `/api` prefix and the same routes as the Express module.
 * TypeScript only: Nest's decorators and dependency injection are built around it.
 */
export const nestjs: Module = {
  id: "nestjs",
  name: "NestJS",
  category: "backend",
  description: {
    az: "NestJS API ayrıca server/ layihəsində: modul, controller və service; /api frontend-dən proxy olunur.",
    en: "NestJS API as its own server/ project: a module, controller and service; /api is proxied from the app.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "angular"],
  languages: ["ts"],
  conflicts: ["turborepo", "module-federation"],
  apply(model, ctx) {
    connectApi(model, ctx, "NestJS");
    model.server = {
      kind: "nestjs",
      port: SERVER_PORT,
      summary: `NestJS API on port ${SERVER_PORT}`,
      dependencies: new Set([
        "@nestjs/common",
        "@nestjs/core",
        "@nestjs/platform-express",
        "reflect-metadata",
        "rxjs",
      ]),
      devDependencies: new Set([
        "@nestjs/cli",
        "@nestjs/schematics",
        "@types/express",
        "@types/node",
        "tslib",
        "typescript",
      ]),
      appImports: [],
      appModules: [],
      routes: [],
      entryImports: [],
      beforeListen: [],
      env: { PORT: String(SERVER_PORT) },
      scripts: {},
      files: new Map(),
      rootFiles: new Map(),
      setup: [],
    };
  },
};
