import { file } from "../../engine/code";
import { devPorts } from "../../frameworks/catalog";
import type { Module } from "../../types";
import { authPanel } from "./panels";
import { reactAuth } from "./react";

/**
 * Better Auth with email and password, on the Express API: `src/auth` creates the instance on
 * MongoDB (the driver's `Db`, as in Better Auth's MongoDB adapter docs; no migrations), the app
 * mounts its handler at `/api/auth/*` before `express.json()`, and `/api/me` shows how a route
 * reads the session.
 *
 * The browser reaches the API through the app's dev server proxy, so requests come from the
 * app's origin: `BETTER_AUTH_URL` is that origin, which Better Auth trusts by default.
 */
export const betterAuth: Module = {
  id: "better-auth",
  name: "Better Auth",
  category: "auth",
  description: {
    az: "Better Auth ilə email və şifrə girişi: Express API-də /api/auth, sessiyalar MongoDB-də, app-də giriş forması.",
    en: "Email and password sign-in with Better Auth: /api/auth on the Express API, sessions in MongoDB, and a sign-in form in the app.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "angular"],
  requires: ["mongodb"],
  // NestJS needs the community integration and `bodyParser: false`; not wired up yet.
  conflicts: ["nestjs"],
  apply(model, ctx) {
    const server = model.server;
    if (!server || server.kind !== "express")
      throw new Error("better-auth needs the Express server");
    const x = ctx.ext.script;
    const appOrigin = `http://localhost:${devPorts[ctx.selection.framework]}`;
    const mongoUri =
      server.env["MONGODB_URI"] ??
      `mongodb://localhost:27017/${ctx.selection.name}`;

    server.dependencies.add("better-auth").add("mongodb");
    server.env["BETTER_AUTH_URL"] = appOrigin;
    server.env["BETTER_AUTH_SECRET"] = "";
    server.files.set(
      `src/auth.${x}`,
      file([
        'import { betterAuth } from "better-auth";',
        'import { mongodbAdapter } from "better-auth/adapters/mongodb";',
        'import { MongoClient } from "mongodb";',
        "",
        `const client = new MongoClient(process.env.MONGODB_URI ?? "${mongoUri}");`,
        "",
        "export const auth = betterAuth({",
        "  // The app's origin: its dev server proxies /api/auth here, so the browser sees one site.",
        `  baseURL: process.env.BETTER_AUTH_URL ?? "${appOrigin}",`,
        "  // The local docker-compose MongoDB is a single server, which has no transactions.",
        "  database: mongodbAdapter(client.db()),",
        "  emailAndPassword: { enabled: true },",
        "});",
      ]),
    );
    server.appImports.push(
      { from: "better-auth/node", named: ["fromNodeHeaders", "toNodeHandler"] },
      { from: "./auth.js", named: ["auth"] },
    );
    server.beforeBody.push(
      "// Better Auth reads its own request bodies, so it goes before express.json().",
      'app.all("/api/auth/{*any}", toNodeHandler(auth));',
    );
    server.routes.push(
      "",
      'app.get("/api/me", async (req, res) => {',
      "  const session = await auth.api.getSession({",
      "    headers: fromNodeHeaders(req.headers),",
      "  });",
      "  if (!session) {",
      '    res.status(401).json({ error: "Not signed in" });',
      "    return;",
      "  }",
      "  res.json(session.user);",
      "});",
    );
    server.setup.push(
      "Give Better Auth a secret: copy `server/.env.example` to `server/.env` and set `BETTER_AUTH_SECRET`, e.g. to the output of:",
      "```bash\nopenssl rand -base64 32\n```",
    );
    if (ctx.selection.framework === "react") reactAuth(model, ctx);
    else authPanel(model, ctx);
    server.summary += ", with Better Auth";
    model.readme.stack.push("Better Auth");
  },
};
