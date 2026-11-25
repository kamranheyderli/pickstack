import { file } from "../../engine/code";
import { runCommand } from "../../engine/finalize";
import { demoClasses } from "../../frameworks/shared/demo";
import { svelteComponent } from "../../frameworks/shared/svelte";
import { sfc } from "../../frameworks/shared/vue";
import { deploy } from "../../versions/known-good";
import type { Ctx, Module, ProjectModel } from "../../types";

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
 */
export const drizzle: Module = {
  id: "drizzle",
  name: "PostgreSQL (Drizzle)",
  category: "database",
  description: {
    az: "Drizzle ORM ilə PostgreSQL: sxem, migration əmrləri, /todos səhifəsi və lokal docker-compose.",
    en: "PostgreSQL with Drizzle ORM: a schema, migration commands, a /todos page and a local docker-compose.",
  },
  frameworks: ["next", "nuxt", "sveltekit"],
  apply(model, ctx) {
    const { name, packageManager } = ctx.selection;
    const x = ctx.ext.script;
    const url = `postgres://postgres:postgres@localhost:5432/${name}`;

    model.pkg.dependencies.add("drizzle-orm").add("pg");
    model.pkg.devDependencies.add("drizzle-kit").add("dotenv");
    if (ctx.isTs) model.pkg.devDependencies.add("@types/pg");
    Object.assign(model.pkg.scripts, {
      "db:push": "drizzle-kit push",
      "db:generate": "drizzle-kit generate",
      "db:migrate": "drizzle-kit migrate",
      "db:studio": "drizzle-kit studio",
    });
    model.env["DATABASE_URL"] = url;

    const { framework } = ctx.selection;
    const nuxt = framework === "nuxt";
    const kit = framework === "sveltekit";
    const dir = {
      next: "db",
      nuxt: "server/db",
      sveltekit: "src/lib/server/db",
    }[framework as "next" | "nuxt" | "sveltekit"];
    const schema = `${dir}/schema.${x}`;
    // SvelteKit 3 reads env through $app/env, declared in src/env; the others read process.env.
    if (kit) {
      model.needsServer = true;
      model.kitEnv["DATABASE_URL"] = [
        'description: "PostgreSQL connection string",',
        `schema: (value) => value ?? "${url}",`,
      ];
    }
    model.files.set(
      schema,
      file([
        'import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";',
        "",
        'export const todos = pgTable("todos", {',
        "  id: integer().primaryKey().generatedAlwaysAsIdentity(),",
        "  title: varchar({ length: 200 }).notNull(),",
        "  done: boolean().notNull().default(false),",
        '  createdAt: timestamp("created_at").notNull().defaultNow(),',
        "});",
      ]),
    );
    model.files.set(
      nuxt ? `server/utils/db.${x}` : `${dir}/index.${x}`,
      file([
        'import { drizzle } from "drizzle-orm/node-postgres";',
        'import { Pool } from "pg";',
        ...(kit ? ['import { DATABASE_URL } from "$app/env/private";'] : []),
        "",
        "// Connects lazily: the first query opens a connection.",
        "const pool = new Pool({",
        kit
          ? "  connectionString: DATABASE_URL,"
          : `  connectionString: process.env.DATABASE_URL ?? "${url}",`,
        "});",
        "// An idle connection can drop (e.g. Postgres restarts); without a listener that crashes the process.",
        'pool.on("error", (error) => console.error("Postgres pool error:", error.message));',
        "",
        "export const db = drizzle({ client: pool });",
      ]),
    );
    model.files.set(
      `drizzle.config.${x}`,
      file([
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
      ]),
    );
    const push = runCommand(packageManager, "db:push");
    if (nuxt) nuxtTodos(model, ctx, push);
    else if (kit) kitTodos(model, ctx, push);
    else
      model.files.set(
        `app/todos/page.${ctx.ext.component}`,
        nextTodosPage(model, ctx, push),
      );
    model.demo.links.push({ path: "/todos", label: "Todos" });

    model.files.set(
      "docker-compose.yml",
      file([
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
      ]),
    );
    model.readme.stack.push("PostgreSQL", "Drizzle ORM");
    model.readme.sections.push({
      title: "Database",
      body: [
        `Start PostgreSQL (needs Docker), copy \`.env.example\` to \`.env\`, then create the tables from \`${schema}\`:`,
        "",
        "```bash",
        "docker compose up -d",
        runCommand(packageManager, "db:push"),
        "```",
        "",
        `\`/todos\` lists and adds rows. Use \`${runCommand(packageManager, "db:generate")}\` and \`${runCommand(packageManager, "db:migrate")}\` for versioned migrations, and \`${runCommand(packageManager, "db:studio")}\` to browse the data.`,
      ].join("\n"),
    });
  },
};

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
