import { file } from "../../engine/code";
import { runCommand } from "../../engine/finalize";
import { demoClasses } from "../../frameworks/shared/demo";
import { deploy } from "../../versions/known-good";
import type { Ctx, Module, ProjectModel } from "../../types";

/**
 * PostgreSQL through Drizzle ORM and node-postgres, following Drizzle's PostgreSQL guide: a
 * `todos` table in `db/schema`, a `db` client, `drizzle.config` for Drizzle Kit and `db:*`
 * scripts. A Postgres container in `docker-compose.yml` serves local development.
 *
 * Next.js: a `/todos` page (a server component rendered per request) lists todos and adds
 * them with a server action.
 */
export const drizzle: Module = {
  id: "drizzle",
  name: "PostgreSQL (Drizzle)",
  category: "database",
  description: {
    az: "Drizzle ORM ilə PostgreSQL: sxem, migration əmrləri, /todos səhifəsi və lokal docker-compose.",
    en: "PostgreSQL with Drizzle ORM: a schema, migration commands, a /todos page and a local docker-compose.",
  },
  frameworks: ["next"],
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

    model.files.set(
      `db/schema.${x}`,
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
      `db/index.${x}`,
      file([
        'import { drizzle } from "drizzle-orm/node-postgres";',
        'import { Pool } from "pg";',
        "",
        "// Connects lazily: the first query opens a connection.",
        "const pool = new Pool({",
        `  connectionString: process.env.DATABASE_URL ?? "${url}",`,
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
        `  schema: "./db/schema.${x}",`,
        '  dialect: "postgresql",',
        "  dbCredentials: {",
        `    url: process.env.DATABASE_URL ?? "${url}",`,
        "  },",
        "});",
      ]),
    );
    model.files.set(
      `app/todos/page.${ctx.ext.component}`,
      nextTodosPage(model, ctx, runCommand(packageManager, "db:push")),
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
        "Start PostgreSQL (needs Docker), copy `.env.example` to `.env`, then create the tables from `db/schema`:",
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
