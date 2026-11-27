import { file } from "../../engine/code";
import { devPorts } from "../../frameworks/catalog";
import type { Ctx, Module, ServerSpec } from "../../types";
import { authSchemaFile } from "./drizzle-schema";
import { authPanel } from "./panels";
import { reactAuth } from "./react";

/**
 * Better Auth with email and password on the Express or NestJS API. `src/auth` creates the
 * instance on the project's database: MongoDB (the driver's `Db`, as in Better Auth's MongoDB
 * adapter docs; no migrations) or PostgreSQL through Drizzle (the CLI's generated tables in
 * `src/db/auth-schema`, created with `db:push`). Express mounts the handler at `/api/auth/*`
 * before `express.json()`; `/api/me` shows how a route reads the session.
 *
 * The browser reaches the API through the app's dev server proxy, so requests come from the
 * app's origin: `BETTER_AUTH_URL` is that origin, which Better Auth trusts by default.
 */
export const betterAuth: Module = {
  id: "better-auth",
  name: "Better Auth",
  category: "auth",
  description: {
    az: "Better Auth ilə email və şifrə girişi: API-də /api/auth, sessiyalar MongoDB və ya PostgreSQL-də, app-də giriş forması.",
    en: "Email and password sign-in with Better Auth: /api/auth on the API, sessions in MongoDB or PostgreSQL, and a sign-in form in the app.",
    ru: "Вход по email и паролю через Better Auth: /api/auth в API, сессии в MongoDB или PostgreSQL и форма входа в приложении.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "angular"],
  // Better Auth stores users and sessions: the project's database holds them.
  requiresOneOf: ["mongodb", "drizzle"],
  apply(model, ctx) {
    const server = model.server;
    if (!server)
      throw new Error("better-auth needs a server (express or nestjs)");
    const nest = server.kind === "nestjs";
    // Nest is TypeScript only; the Express server follows the app's language.
    const x = nest ? "ts" : ctx.ext.script;
    const appOrigin = `http://localhost:${devPorts[ctx.selection.framework]}`;
    server.dependencies.add("better-auth");
    server.env["BETTER_AUTH_URL"] = appOrigin;
    server.env["BETTER_AUTH_SECRET"] = "";
    const database = ctx.has("drizzle")
      ? drizzleDatabase(server, x)
      : mongoDatabase(server, ctx);
    server.files.set(
      `src/auth.${x}`,
      file([
        'import { betterAuth } from "better-auth";',
        ...database.imports,
        ...(database.setup.length ? ["", ...database.setup] : []),
        "",
        "export const auth = betterAuth({",
        "  // The app's origin: its dev server proxies /api/auth here, so the browser sees one site.",
        `  baseURL: process.env.BETTER_AUTH_URL ?? "${appOrigin}",`,
        ...database.option,
        "  emailAndPassword: { enabled: true },",
        "});",
      ]),
    );
    if (nest) withNest(server);
    else withExpress(server);
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

interface AuthDatabase {
  imports: string[];
  setup: string[];
  /** The `database` option, with its comment. */
  option: string[];
}

/** MongoDB through the driver's `Db`; Better Auth creates its own indexes, no migrations. */
function mongoDatabase(server: ServerSpec, ctx: Ctx): AuthDatabase {
  const uri =
    server.env["MONGODB_URI"] ??
    `mongodb://localhost:27017/${ctx.selection.name}`;
  server.dependencies.add("mongodb");
  return {
    imports: [
      'import { mongodbAdapter } from "better-auth/adapters/mongodb";',
      'import { MongoClient } from "mongodb";',
    ],
    setup: [
      `const client = new MongoClient(process.env.MONGODB_URI ?? "${uri}");`,
    ],
    option: [
      "  // The local docker-compose MongoDB is a single server, which has no transactions.",
      "  database: mongodbAdapter(client.db()),",
    ],
  };
}

/** PostgreSQL through the project's Drizzle client, with the CLI's tables in their own file. */
function drizzleDatabase(server: ServerSpec, x: string): AuthDatabase {
  server.files.set(`src/db/auth-schema.${x}`, authSchemaFile);
  return {
    imports: [
      'import { drizzleAdapter } from "better-auth/adapters/drizzle";',
      'import * as schema from "./db/auth-schema.js";',
      'import { db } from "./db/index.js";',
    ],
    setup: [],
    option: [
      "  // Tables from src/db/auth-schema; `db:push` creates them with the app's own.",
      '  database: drizzleAdapter(db, { provider: "pg", schema }),',
    ],
  };
}

/** The handler before `express.json()`, and `/api/me` reading the session from the headers. */
function withExpress(server: ServerSpec): void {
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
}

/**
 * `@thallesp/nestjs-better-auth`, the integration Better Auth's NestJS docs point to (community
 * maintained). Nest's own body parser is off so Better Auth can read its requests; the module
 * adds the JSON parser back for every other route. Its global guard would make every route
 * private, so it is off: `/api/hello` and `/api/todos` stay public, as on Express, and
 * `MeController` guards `/api/me` itself.
 */
function withNest(server: ServerSpec): void {
  server.dependencies.add("@thallesp/nestjs-better-auth");
  server.factoryOptions.push("bodyParser: false");
  server.appImports.push(
    { from: "@thallesp/nestjs-better-auth", named: ["AuthModule"] },
    { from: "./auth.js", named: ["auth"] },
    { from: "./me/me.module.js", named: ["MeModule"] },
  );
  server.appModules.push(
    "AuthModule.forRoot({ auth, disableGlobalAuthGuard: true })",
    "MeModule",
  );
  server.files.set(
    "src/me/me.controller.ts",
    file([
      'import { Controller, Get, UseGuards } from "@nestjs/common";',
      "import {",
      "  AuthGuard,",
      "  Session,",
      "  type UserSession,",
      '} from "@thallesp/nestjs-better-auth";',
      "",
      '@Controller("me")',
      "export class MeController {",
      "  /** The signed-in user; the guard answers 401 without a session. */",
      "  @Get()",
      "  @UseGuards(AuthGuard)",
      '  me(@Session() session: UserSession): UserSession["user"] {',
      "    return session.user;",
      "  }",
      "}",
    ]),
  );
  server.files.set(
    "src/me/me.module.ts",
    file([
      'import { Module } from "@nestjs/common";',
      'import { MeController } from "./me.controller.js";',
      "",
      "@Module({ controllers: [MeController] })",
      "export class MeModule {}",
    ]),
  );
}
