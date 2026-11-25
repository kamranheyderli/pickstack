import { file } from "../../engine/code";
import { installCommand, runCommand } from "../../engine/finalize";
import { demoClasses } from "../../frameworks/shared/demo";
import { svelteComponent } from "../../frameworks/shared/svelte";
import { sfc } from "../../frameworks/shared/vue";
import { deploy } from "../../versions/known-good";
import type { Ctx, Module, ProjectModel, ServerSpec } from "../../types";

/**
 * PostgreSQL through Drizzle ORM and node-postgres, following Drizzle's PostgreSQL guide: a
 * `todos` table in `db/schema`, a `db` client, `drizzle.config` for Drizzle Kit and `db:*`
 * scripts. A Postgres container in `docker-compose.yml` serves local development.
 *
 * Next.js: a `/todos` page (a server component rendered per request) lists todos and adds
 * them with a server action. Nuxt: the schema lives in `server/db`, the client in
 * `server/utils` (auto-imported by server routes), `/api/todos` routes serve the
 * `/todos` page. SvelteKit: `src/lib/server/db` as `sv add drizzle` lays it out, DATABASE_URL
 * declared in `src/env`, and a `/todos` route with a load function and a form action; the
 * site becomes a server build (`needsServer`), other pages stay prerendered.
 *
 * SPAs need Express or NestJS: the database goes into `server/` with `/api/todos` routes
 * (Express handlers, or a Nest `TodosModule`).
 */
export const drizzle: Module = {
  id: "drizzle",
  name: "PostgreSQL (Drizzle)",
  category: "database",
  description: {
    az: "Drizzle ORM ilə PostgreSQL: sxem, migration əmrləri, todo nümunəsi və lokal docker-compose.",
    en: "PostgreSQL with Drizzle ORM: a schema, migration commands, a todo example and a local docker-compose.",
  },
  frameworks: [
    "next",
    "nuxt",
    "sveltekit",
    "react",
    "vue",
    "svelte",
    "solid",
    "preact",
    "angular",
  ],
  // SPAs have no server of their own: the database lives in the backend's server/ project.
  spaRequiresOneOf: ["express", "nestjs"],
  apply(model, ctx) {
    const url = `postgres://postgres:postgres@localhost:5432/${ctx.selection.name}`;
    if (model.server) withServer(model, model.server, ctx, url);
    else withApp(model, ctx, url);
    model.readme.stack.push("PostgreSQL", "Drizzle ORM");
  },
};

const DB_SCRIPTS = {
  "db:push": "drizzle-kit push",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio",
};

const schemaFile = file([
  'import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";',
  "",
  'export const todos = pgTable("todos", {',
  "  id: integer().primaryKey().generatedAlwaysAsIdentity(),",
  "  title: varchar({ length: 200 }).notNull(),",
  "  done: boolean().notNull().default(false),",
  '  createdAt: timestamp("created_at").notNull().defaultNow(),',
  "});",
]);

/** The pool and the `db` client; `envImport` is how the connection string is read, if not process.env. */
function clientFile(connection: string, envImport: string[] = []): string {
  return file([
    'import { drizzle } from "drizzle-orm/node-postgres";',
    'import { Pool } from "pg";',
    ...envImport,
    "",
    "// Connects lazily: the first query opens a connection.",
    "const pool = new Pool({",
    `  connectionString: ${connection},`,
    "});",
    "// An idle connection can drop (e.g. Postgres restarts); without a listener that crashes the process.",
    'pool.on("error", (error) => console.error("Postgres pool error:", error.message));',
    "",
    "export const db = drizzle({ client: pool });",
  ]);
}

/** Drizzle Kit's config; it runs outside the app, so it loads `.env` itself. */
function configFile(schema: string, url: string): string {
  return file([
    'import "dotenv/config";',
    'import { defineConfig } from "drizzle-kit";',
    "",
    "export default defineConfig({",
    '  out: "./drizzle",',
    `  schema: "./${schema}",`,
    '  dialect: "postgresql",',
    "  dbCredentials: {",
    `    url: process.env.DATABASE_URL ?? "${url}",`,
    "  },",
    "});",
  ]);
}

function composeFile(name: string): string {
  return file([
    "# Local PostgreSQL for development: docker compose up -d",
    "services:",
    "  postgres:",
    `    image: ${deploy.postgres}`,
    "    environment:",
    "      POSTGRES_USER: postgres",
    "      POSTGRES_PASSWORD: postgres",
    `      POSTGRES_DB: ${name}`,
    "    ports:",
    '      - "5432:5432"',
    "    volumes:",
    "      - postgres-data:/var/lib/postgresql",
    "",
    "volumes:",
    "  postgres-data:",
  ]);
}

/** Next.js, Nuxt and SvelteKit: the database belongs to the app itself. */
function withApp(model: ProjectModel, ctx: Ctx, url: string): void {
  const { framework, packageManager } = ctx.selection;
  const x = ctx.ext.script;
  const run = (script: string) => runCommand(packageManager, script);

  model.pkg.dependencies.add("drizzle-orm").add("pg");
  model.pkg.devDependencies.add("drizzle-kit").add("dotenv");
  if (ctx.isTs) model.pkg.devDependencies.add("@types/pg");
  Object.assign(model.pkg.scripts, DB_SCRIPTS);
  model.env["DATABASE_URL"] = url;

  const nuxt = framework === "nuxt";
  const kit = framework === "sveltekit";
  const dir = nuxt ? "server/db" : kit ? "src/lib/server/db" : "db";
  const schema = `${dir}/schema.${x}`;
  model.files.set(schema, schemaFile);
  if (kit) {
    // SvelteKit 3 reads env through $app/env, declared in src/env.
    model.needsServer = true;
    model.kitEnv["DATABASE_URL"] = [
      'description: "PostgreSQL connection string",',
      `schema: (value) => value ?? "${url}",`,
    ];
    model.files.set(
      `${dir}/index.${x}`,
      clientFile("DATABASE_URL", [
        'import { DATABASE_URL } from "$app/env/private";',
      ]),
    );
  } else {
    model.files.set(
      nuxt ? `server/utils/db.${x}` : `${dir}/index.${x}`,
      clientFile(`process.env.DATABASE_URL ?? "${url}"`),
    );
  }
  model.files.set(`drizzle.config.${x}`, configFile(schema, url));

  const push = run("db:push");
  if (nuxt) nuxtTodos(model, ctx, push);
  else if (kit) kitTodos(model, ctx, push);
  else
    model.files.set(
      `app/todos/page.${ctx.ext.component}`,
      nextTodosPage(model, ctx, push),
    );
  model.demo.links.push({ path: "/todos", label: "Todos" });
  model.files.set("docker-compose.yml", composeFile(ctx.selection.name));
  model.readme.sections.push({
    title: "Database",
    body: [
      `Start PostgreSQL (needs Docker), copy \`.env.example\` to \`.env\`, then create the tables from \`${schema}\`:`,
      "",
      "```bash",
      "docker compose up -d",
      push,
      "```",
      "",
      `\`/todos\` lists and adds rows. Use \`${run("db:generate")}\` and \`${run("db:migrate")}\` for versioned migrations, and \`${run("db:studio")}\` to browse the data.`,
    ].join("\n"),
  });
}

/** SPAs: the database belongs to the Express or NestJS project in server/. */
function withServer(
  model: ProjectModel,
  server: ServerSpec,
  ctx: Ctx,
  url: string,
): void {
  const { packageManager } = ctx.selection;
  const nest = server.kind === "nestjs";
  // Nest is TypeScript only; the Express server follows the app's language.
  const x = nest ? "ts" : ctx.ext.script;
  const ts = nest || ctx.isTs;

  server.dependencies.add("drizzle-orm").add("pg");
  server.devDependencies.add("drizzle-kit").add("dotenv");
  if (ts) server.devDependencies.add("@types/pg");
  Object.assign(server.scripts, DB_SCRIPTS);
  server.env["DATABASE_URL"] = url;
  server.files.set(`src/db/schema.${x}`, schemaFile);
  server.files.set(
    `src/db/index.${x}`,
    clientFile(`process.env.DATABASE_URL ?? "${url}"`),
  );
  server.files.set(
    `drizzle.config.${x}`,
    configFile(`src/db/schema.${x}`, url),
  );
  if (nest) nestTodos(server);
  else expressTodos(server);
  server.rootFiles.set("docker-compose.yml", composeFile(ctx.selection.name));
  server.setup.push(
    "Start PostgreSQL (needs Docker), or point `DATABASE_URL` in `server/.env` at your own instance, then create the tables:",
    [
      "```bash",
      "docker compose up -d",
      `cd server && ${installCommand(packageManager)} && ${runCommand(packageManager, "db:push")}`,
      "```",
    ].join("\n"),
  );
  server.summary += ", with PostgreSQL (Drizzle)";
}

/** `GET`/`POST /api/todos` on the Express app. */
function expressTodos(server: ServerSpec): void {
  server.appImports.push(
    { from: "drizzle-orm", named: ["desc"] },
    { from: "./db/index.js", named: ["db"] },
    { from: "./db/schema.js", named: ["todos"] },
  );
  server.routes.push(
    "",
    'app.get("/api/todos", async (_req, res) => {',
    "  const rows = await db.select().from(todos).orderBy(desc(todos.createdAt)).limit(100);",
    "  res.json(rows);",
    "});",
    "",
    'app.post("/api/todos", async (req, res) => {',
    '  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";',
    "  if (!title) {",
    '    res.status(400).json({ error: "title is required" });',
    "    return;",
    "  }",
    "  const [todo] = await db",
    "    .insert(todos)",
    "    .values({ title: title.slice(0, 200) })",
    "    .returning();",
    "  res.status(201).json(todo);",
    "});",
  );
}

/** A `TodosModule` with a service over the `db` client and a controller for `/api/todos`. */
function nestTodos(server: ServerSpec): void {
  server.appImports.push({
    from: "./todos/todos.module.js",
    named: ["TodosModule"],
  });
  server.appModules.push("TodosModule");
  server.files.set(
    "src/todos/todos.service.ts",
    file([
      'import { Injectable } from "@nestjs/common";',
      'import { desc } from "drizzle-orm";',
      'import { db } from "../db/index.js";',
      'import { todos } from "../db/schema.js";',
      "",
      "export type Todo = typeof todos.$inferSelect;",
      "",
      "@Injectable()",
      "export class TodosService {",
      "  findAll(): Promise<Todo[]> {",
      "    return db.select().from(todos).orderBy(desc(todos.createdAt)).limit(100);",
      "  }",
      "",
      "  async create(title: string): Promise<Todo | undefined> {",
      "    const [todo] = await db.insert(todos).values({ title }).returning();",
      "    return todo;",
      "  }",
      "}",
    ]),
  );
  server.files.set(
    "src/todos/todos.controller.ts",
    file([
      'import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";',
      'import { type Todo, TodosService } from "./todos.service.js";',
      "",
      '@Controller("todos")',
      "export class TodosController {",
      "  constructor(private readonly todosService: TodosService) {}",
      "",
      "  @Get()",
      "  findAll(): Promise<Todo[]> {",
      "    return this.todosService.findAll();",
      "  }",
      "",
      "  @Post()",
      "  create(@Body() body: { title?: unknown }): Promise<Todo | undefined> {",
      '    const title = typeof body?.title === "string" ? body.title.trim() : "";',
      '    if (!title) throw new BadRequestException("title is required");',
      "    return this.todosService.create(title.slice(0, 200));",
      "  }",
      "}",
    ]),
  );
  server.files.set(
    "src/todos/todos.module.ts",
    file([
      'import { Module } from "@nestjs/common";',
      'import { TodosController } from "./todos.controller.js";',
      'import { TodosService } from "./todos.service.js";',
      "",
      "@Module({",
      "  controllers: [TodosController],",
      "  providers: [TodosService],",
      "})",
      "export class TodosModule {}",
    ]),
  );
}

/** A server component that reads per request, and a server action that inserts a row. */
function nextTodosPage(model: ProjectModel, ctx: Ctx, push: string): string {
  const cls = demoClasses(model);
  const input =
    model.styles.mode === "tailwind"
      ? ' className="rounded-lg border border-slate-300 px-3 py-2"'
      : "";
  return file([
    'import { desc } from "drizzle-orm";',
    'import { revalidatePath } from "next/cache";',
    'import { connection } from "next/server";',
    'import { db } from "@/db";',
    'import { todos } from "@/db/schema";',
    "",
    `async function addTodo(formData${ctx.isTs ? ": FormData" : ""}) {`,
    '  "use server";',
    '  const title = String(formData.get("title") ?? "").trim();',
    "  if (!title) return;",
    "  await db.insert(todos).values({ title: title.slice(0, 200) });",
    '  revalidatePath("/todos");',
    "}",
    "",
    "export default async function Todos() {",
    "  // Render per request: the database is not there when the app is built.",
    "  await connection();",
    "  const rows = await db",
    "    .select()",
    "    .from(todos)",
    "    .orderBy(desc(todos.createdAt))",
    "    .limit(100)",
    "    .catch(() => null);",
    "",
    "  return (",
    `    <section className="${cls.page}">`,
    `      <h1 className="${cls.title}">Todos</h1>`,
    `      <form action={addTodo} className="${cls.row}">`,
    `        <input${input} name="title" required maxLength={200} placeholder="What needs doing?" />`,
    `        <button className="${cls.btn}" type="submit">`,
    "          Add",
    "        </button>",
    "      </form>",
    "      {rows ? (",
    "        <ul>",
    "          {rows.map((todo) => (",
    "            <li key={todo.id}>{todo.title}</li>",
    "          ))}",
    "        </ul>",
    "      ) : (",
    `        <p className="${cls.text}">`,
    `          The database isn&apos;t ready: run docker compose up -d, then ${push}.`,
    "        </p>",
    "      )}",
    "    </section>",
    "  );",
    "}",
  ]);
}

/** Nitro routes for the table and a page that fetches them on the server and posts from the client. */
function nuxtTodos(model: ProjectModel, ctx: Ctx, push: string): void {
  const x = ctx.ext.script;
  const cls = demoClasses(model);
  model.files.set(
    `server/api/todos.get.${x}`,
    file([
      'import { desc } from "drizzle-orm";',
      'import { todos } from "../db/schema";',
      "",
      "export default defineEventHandler(() =>",
      "  db.select().from(todos).orderBy(desc(todos.createdAt)).limit(100),",
      ");",
    ]),
  );
  model.files.set(
    `server/api/todos.post.${x}`,
    file([
      'import { todos } from "../db/schema";',
      "",
      "export default defineEventHandler(async (event) => {",
      `  const body = await readBody${ctx.isTs ? "<{ title?: unknown }>" : ""}(event);`,
      '  const title = typeof body?.title === "string" ? body.title.trim() : "";',
      "  if (!title) {",
      '    throw createError({ statusCode: 400, statusMessage: "title is required" });',
      "  }",
      "  const [todo] = await db",
      "    .insert(todos)",
      "    .values({ title: title.slice(0, 200) })",
      "    .returning();",
      "  setResponseStatus(event, 201);",
      "  return todo;",
      "});",
    ]),
  );
  const input =
    model.styles.mode === "tailwind"
      ? ' class="rounded-lg border border-slate-300 px-3 py-2"'
      : "";
  model.files.set(
    "app/pages/todos.vue",
    sfc(
      ctx,
      [
        ...(model.seo ? ['useSeoMeta({ title: "Todos" });', ""] : []),
        'const { data: todos, error, refresh } = await useFetch("/api/todos");',
        'const title = ref("");',
        "",
        "async function add() {",
        '  await $fetch("/api/todos", { method: "POST", body: { title: title.value } });',
        '  title.value = "";',
        "  await refresh();",
        "}",
      ],
      [
        `<section class="${cls.page}">`,
        `  <h1 class="${cls.title}">Todos</h1>`,
        `  <form class="${cls.row}" @submit.prevent="add">`,
        `    <input v-model="title"${input} required maxlength="200" placeholder="What needs doing?" />`,
        `    <button class="${cls.btn}" type="submit">Add</button>`,
        "  </form>",
        `  <p v-if="error" class="${cls.text}">`,
        `    The database isn't ready: run docker compose up -d, then ${push}.`,
        "  </p>",
        "  <ul v-else>",
        '    <li v-for="todo in todos" :key="todo.id">{{ todo.title }}</li>',
        "  </ul>",
        "</section>",
      ],
    ),
  );
}

/** A route whose load function reads the table and whose default form action inserts a row. */
function kitTodos(model: ProjectModel, ctx: Ctx, push: string): void {
  const x = ctx.ext.script;
  const ts = ctx.isTs;
  const cls = demoClasses(model);
  model.files.set(
    `src/routes/todos/+page.server.${x}`,
    file([
      'import { fail } from "@sveltejs/kit";',
      'import { desc } from "drizzle-orm";',
      'import { db } from "#lib/server/db/index.js";',
      'import { todos } from "#lib/server/db/schema.js";',
      ...(ts
        ? ['import type { Actions, PageServerLoad } from "./$types";']
        : []),
      "",
      "// Read per request: the database is not there when the site is built.",
      "export const prerender = false;",
      "",
      ...(ts ? [] : ['/** @type {import("./$types").PageServerLoad} */']),
      `export const load${ts ? ": PageServerLoad" : ""} = async () => {`,
      "  const rows = await db",
      "    .select()",
      "    .from(todos)",
      "    .orderBy(desc(todos.createdAt))",
      "    .limit(100)",
      "    .catch(() => null);",
      "  return { todos: rows };",
      "};",
      "",
      ...(ts ? [] : ['/** @type {import("./$types").Actions} */']),
      `export const actions${ts ? ": Actions" : ""} = {`,
      "  default: async ({ request }) => {",
      "    const data = await request.formData();",
      '    const title = String(data.get("title") ?? "").trim();',
      '    if (!title) return fail(400, { error: "title is required" });',
      "    await db.insert(todos).values({ title: title.slice(0, 200) });",
      "  },",
      "};",
    ]),
  );
  const input =
    model.styles.mode === "tailwind"
      ? ' class="rounded-lg border border-slate-300 px-3 py-2"'
      : "";
  model.files.set(
    "src/routes/todos/+page.svelte",
    svelteComponent(
      ctx,
      [
        { from: "$app/forms", named: ["enhance"] },
        ...(ts ? [{ from: "./$types", types: ["PageProps"] }] : []),
      ],
      [
        ...(ts ? [] : ['/** @type {import("./$types").PageProps} */']),
        `let { data, form }${ts ? ": PageProps" : ""} = $props();`,
      ],
      [
        ...(model.seo
          ? [
              "<svelte:head>",
              `  <title>Todos | ${ctx.selection.name}</title>`,
              "</svelte:head>",
              "",
            ]
          : []),
        `<section class="${cls.page}">`,
        `  <h1 class="${cls.title}">Todos</h1>`,
        `  <form method="POST" use:enhance class="${cls.row}">`,
        `    <input${input} name="title" required maxlength="200" placeholder="What needs doing?" />`,
        `    <button class="${cls.btn}" type="submit">Add</button>`,
        "  </form>",
        "  {#if form?.error}",
        `    <p class="${cls.text}">{form.error}</p>`,
        "  {/if}",
        "  {#if data.todos}",
        "    <ul>",
        "      {#each data.todos as todo (todo.id)}",
        "        <li>{todo.title}</li>",
        "      {/each}",
        "    </ul>",
        "  {:else}",
        `    <p class="${cls.text}">`,
        `      The database isn't ready: run docker compose up -d, then ${push}.`,
        "    </p>",
        "  {/if}",
        "</section>",
      ],
    ),
  );
}
