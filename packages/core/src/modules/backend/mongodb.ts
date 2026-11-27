import { file } from "../../engine/code";
import { deploy } from "../../versions/known-good";
import type { Ctx, Module, ServerSpec } from "../../types";

/**
 * MongoDB through Mongoose, with a `Todo` model and `/api/todos` routes to list and add todos.
 * Express opens the connection before it listens; NestJS uses `@nestjs/mongoose` (a root
 * `MongooseModule.forRoot` and a `TodosModule`). `docker-compose.yml` at the root runs a local
 * MongoDB, and MONGODB_URI points the server at it.
 */
export const mongodb: Module = {
  id: "mongodb",
  name: "MongoDB",
  category: "database",
  description: {
    az: "Mongoose ilə MongoDB: model, /api/todos route-ları və lokal docker-compose.",
    en: "MongoDB with Mongoose: a model, /api/todos routes and a local docker-compose.",
    ru: "MongoDB с Mongoose: модель, маршруты /api/todos и локальный docker-compose.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "angular"],
  requiresOneOf: ["express", "nestjs"],
  apply(model, ctx) {
    const server = model.server;
    if (!server) throw new Error("mongodb needs a server (express or nestjs)");
    const uri = `mongodb://localhost:27017/${ctx.selection.name}`;

    server.dependencies.add("mongoose");
    server.env["MONGODB_URI"] = uri;
    if (server.kind === "nestjs") withNest(server, uri);
    else withExpress(server, ctx, uri);
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

/** A `connectDb` the entry awaits before `listen`, a `Todo` model and two routes. */
function withExpress(server: ServerSpec, ctx: Ctx, uri: string): void {
  const x = ctx.ext.script;
  server.files.set(
    `src/db.${x}`,
    file([
      'import mongoose from "mongoose";',
      "",
      "/** Opens the connection Mongoose models use; call it once, before serving requests. */",
      `export async function connectDb(uri${ctx.isTs ? ": string" : ""}) {`,
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
}

/** `@nestjs/mongoose`, as in Nest's MongoDB guide: a schema class, a feature module and DI. */
function withNest(server: ServerSpec, uri: string): void {
  server.dependencies.add("@nestjs/mongoose");
  server.appImports.push(
    { from: "@nestjs/mongoose", named: ["MongooseModule"] },
    { from: "./todos/todos.module.js", named: ["TodosModule"] },
  );
  server.appModules.push(
    `MongooseModule.forRoot(process.env.MONGODB_URI ?? "${uri}")`,
    "TodosModule",
  );
  server.files.set(
    "src/todos/todo.schema.ts",
    file([
      'import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";',
      'import type { HydratedDocument } from "mongoose";',
      "",
      "@Schema({ timestamps: true })",
      "export class Todo {",
      "  @Prop({ required: true, trim: true, maxlength: 200 })",
      "  title: string;",
      "",
      "  @Prop({ default: false })",
      "  done: boolean;",
      "}",
      "",
      "export type TodoDocument = HydratedDocument<Todo>;",
      "export const TodoSchema = SchemaFactory.createForClass(Todo);",
    ]),
  );
  server.files.set(
    "src/todos/todos.service.ts",
    file([
      'import { Injectable } from "@nestjs/common";',
      'import { InjectModel } from "@nestjs/mongoose";',
      'import { Model } from "mongoose";',
      'import { Todo, type TodoDocument } from "./todo.schema.js";',
      "",
      "@Injectable()",
      "export class TodosService {",
      "  constructor(@InjectModel(Todo.name) private readonly todoModel: Model<Todo>) {}",
      "",
      "  findAll(): Promise<TodoDocument[]> {",
      "    return this.todoModel.find().sort({ createdAt: -1 }).limit(100).exec();",
      "  }",
      "",
      "  create(title: string): Promise<TodoDocument> {",
      "    return this.todoModel.create({ title });",
      "  }",
      "}",
    ]),
  );
  server.files.set(
    "src/todos/todos.controller.ts",
    file([
      'import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";',
      'import type { TodoDocument } from "./todo.schema.js";',
      'import { TodosService } from "./todos.service.js";',
      "",
      '@Controller("todos")',
      "export class TodosController {",
      "  constructor(private readonly todosService: TodosService) {}",
      "",
      "  @Get()",
      "  findAll(): Promise<TodoDocument[]> {",
      "    return this.todosService.findAll();",
      "  }",
      "",
      "  @Post()",
      "  create(@Body() body: { title?: unknown }): Promise<TodoDocument> {",
      '    const title = typeof body?.title === "string" ? body.title.trim() : "";',
      '    if (!title) throw new BadRequestException("title is required");',
      "    return this.todosService.create(title);",
      "  }",
      "}",
    ]),
  );
  server.files.set(
    "src/todos/todos.module.ts",
    file([
      'import { Module } from "@nestjs/common";',
      'import { MongooseModule } from "@nestjs/mongoose";',
      'import { Todo, TodoSchema } from "./todo.schema.js";',
      'import { TodosController } from "./todos.controller.js";',
      'import { TodosService } from "./todos.service.js";',
      "",
      "@Module({",
      "  imports: [MongooseModule.forFeature([{ name: Todo.name, schema: TodoSchema }])],",
      "  controllers: [TodosController],",
      "  providers: [TodosService],",
      "})",
      "export class TodosModule {}",
    ]),
  );
}
