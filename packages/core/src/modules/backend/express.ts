import { runCommand } from "../../engine/finalize";
import type { Module } from "../../types";
import { API_WIDGET, apiWidget } from "./widget";

/** The API's port; the app's dev server proxies `/api` here. */
export const SERVER_PORT = 3001;

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
    // The app calls the API through its dev server, so no CORS setup is needed.
    model.apiProxy = `http://localhost:${SERVER_PORT}`;
    for (const [path, content] of apiWidget(model, ctx))
      model.files.set(path, content);
    model.demo.widgets.push(API_WIDGET);
    model.server = {
      port: SERVER_PORT,
      summary: `Express 5 API on port ${SERVER_PORT}`,
      dependencies: new Set(["express"]),
      devDependencies: new Set(
        ctx.isTs ? ["@types/express", "@types/node", "tsx", "typescript"] : [],
      ),
      appImports: [],
      routes: [
        'app.get("/api/health", (_req, res) => {',
        "  res.json({ ok: true });",
        "});",
        "",
        'app.get("/api/hello", (req, res) => {',
        '  const name = typeof req.query.name === "string" ? req.query.name : "world";',
        "  res.json({ message: `Hello, ${name}!` });",
        "});",
      ],
      entryImports: [],
      beforeListen: [],
      env: { PORT: String(SERVER_PORT) },
      files: new Map(),
      rootFiles: new Map(),
      setup: [],
    };
    model.readme.stack.push("Express");
    model.readme.sections.push({
      title: "API",
      body: `The API lives in \`../server\` (Express). Start it with \`${runCommand(ctx.selection.packageManager, "dev")}\` there; requests to \`/api\` from this app are proxied to it in development.`,
    });
  },
};
