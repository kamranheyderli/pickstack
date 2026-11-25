import { file } from "../../engine/code";
import { deploy } from "../../versions/known-good";
import type { Module } from "../../types";

/**
 * MongoDB through Mongoose: a connection the server opens before it listens, a `Todo` model
 * and `/api/todos` routes to list and add todos. `docker-compose.yml` at the root runs a local
 * MongoDB, and MONGODB_URI points the server at it.
 */
export const mongodb: Module = {
  id: "mongodb",
  name: "MongoDB",
  category: "database",
  description: {
    az: "Mongoose ilə MongoDB: model, /api/todos route-ları və lokal docker-compose.",
    en: "MongoDB with Mongoose: a model, /api/todos routes and a local docker-compose.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "angular"],
  requires: ["express"],
  apply(model, ctx) {
    const server = model.server;
    if (!server) throw new Error("mongodb needs a server (express)");
    const { name } = ctx.selection;
    const ts = ctx.isTs;
    const x = ctx.ext.script;
    const uri = `mongodb://localhost:27017/${name}`;

    server.dependencies.add("mongoose");
    server.env["MONGODB_URI"] = uri;
    server.files.set(
      `src/db.${x}`,
      file([
        'import mongoose from "mongoose";',
        "",
        "/** Opens the connection Mongoose models use; call it once, before serving requests. */",
        `export async function connectDb(uri${ts ? ": string" : ""}) {`,
        "  await mongoose.connect(uri);",
        "  console.log(`Connected to ${mongoose.connection.name}`);",
        "}",
      ]),
    );
    server.files.set(
      `src/models/todo.${x}`,
      file([
        'import { model, Schema } from "mongoose";',
        "",
        "const todoSchema = new Schema(",
        "  {",
        "    title: { type: String, required: true, trim: true, maxlength: 200 },",
        "    done: { type: Boolean, default: false },",
        "  },",
        "  { timestamps: true },",
        ");",
        "",
        'export const Todo = model("Todo", todoSchema);',
      ]),
    );
    server.appImports.push({ from: "./models/todo.js", named: ["Todo"] });
    server.routes.push(
      "",
      'app.get("/api/todos", async (_req, res) => {',
      "  const todos = await Todo.find().sort({ createdAt: -1 }).limit(100);",
      "  res.json(todos);",
      "});",
      "",
      'app.post("/api/todos", async (req, res) => {',
      '  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";',
      "  if (!title) {",
      '    res.status(400).json({ error: "title is required" });',
      "    return;",
      "  }",
      "  const todo = await Todo.create({ title });",
      "  res.status(201).json(todo);",
      "});",
    );
    server.entryImports.push({ from: "./db.js", named: ["connectDb"] });
    server.beforeListen.push(
      `await connectDb(process.env.MONGODB_URI ?? "${uri}");`,
    );
    server.rootFiles.set(
      "docker-compose.yml",
      file([
        "# Local MongoDB for development: docker compose up -d",
        "services:",
        "  mongo:",
        `    image: ${deploy.mongo}`,
        "    ports:",
        '      - "27017:27017"',
        "    volumes:",
        "      - mongo-data:/data/db",
        "",
        "volumes:",
        "  mongo-data:",
      ]),
    );
    server.setup.push(
      "Start MongoDB (needs Docker), or point `MONGODB_URI` in `server/.env` at your own instance:",
      "```bash\ndocker compose up -d\n```",
    );
    server.summary += ", with MongoDB (Mongoose)";
    model.readme.stack.push("MongoDB");
  },
};
