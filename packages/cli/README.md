# create-pickstack

Create a web project with the stack you pick: framework, UI kit, state, routing, data fetching, testing, linting, SEO, AI agent configs, and optionally a Node.js API (Express or NestJS) with a database (PostgreSQL with Drizzle, or MongoDB) and sign-in with Better Auth. Every combination it offers is checked with a real install, build, lint and test.

```bash
npm create pickstack@latest
pnpm create pickstack
yarn create pickstack
bun create pickstack
```

> There is nothing to install: `npm create pickstack@latest` downloads and runs this package in one step. (`npm i create-pickstack`, which npm shows for every package, only adds it to `node_modules`.)

## Full-stack

For React, Vue, Svelte, Solid, Preact and Angular, pick a backend and a database: the app goes to `web/`, the API to `server/`, and `docker-compose.yml` runs the database locally. Next.js, Nuxt and SvelteKit use their own server, so they only ask for the database.

```bash
npm create pickstack@latest my-app -- --preset react-fullstack
npm create pickstack@latest my-app -- --framework react --modules nestjs,drizzle --yes
npm create pickstack@latest my-app -- --framework vue --modules express,drizzle,better-auth --yes
```

Add `better-auth` for email and password sign-in: the API serves `/api/auth` with Better Auth, users and sessions are stored in the database you picked, and the app gets a sign-in and sign-up form.

It asks for the project name, framework, language and the modules for each category. The modules shown are only those that work with your framework, and options that conflict with your earlier picks are shown with the reason.

## Without questions

```bash
npm create pickstack@latest my-app -- --framework vue --modules tailwind,pinia,vue-router,vitest --yes
pnpm create pickstack my-app --framework next --modules tailwind,shadcn,claude-code --yes
```

The web configurator shows the exact command for any selection.

| Option                 |                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `-f, --framework <id>` | `react`, `vue`, `angular`, `svelte`, `solid`, `preact`, `next`, `nuxt`, `sveltekit`, `astro` |
| `-l, --language <id>`  | `ts` (default) or `js`                                                                       |
| `-m, --modules <ids>`  | comma-separated module ids; `--list` shows them all                                          |
| `--pm <id>`            | `npm`, `pnpm`, `yarn` or `bun` (default: the one running the command)                        |
| `--site-url <url>`     | public origin for canonical URLs, sitemap and `llms.txt`                                     |
| `-o, --open <editor>`  | open the project afterwards in `code` (VS Code), `cursor`, `windsurf` or `zed`               |
| `-y, --yes`            | don't ask; use defaults for anything not given                                               |
| `--no-install`         | skip installing dependencies                                                                 |
| `--no-git`             | skip `git init`                                                                              |
| `--list`               | list frameworks and modules                                                                  |

## For AI agents (MCP)

`create-pickstack --mcp` runs an MCP server over stdio, so Claude Code, Cursor or any MCP client can create projects for you. It has three tools:

- `list_options`: the frameworks, presets and modules, with what each supports and conflicts with.
- `preview_project`: the files a selection produces, without writing anything.
- `create_project`: writes the project to a folder, with optional `git init` and install.

Claude Code:

```bash
claude mcp add pickstack -- npx -y create-pickstack@latest --mcp
```

Cursor (`.cursor/mcp.json`) or VS Code (`.vscode/mcp.json`, under `"servers"`):

```json
{
  "mcpServers": {
    "pickstack": {
      "command": "npx",
      "args": ["-y", "create-pickstack@latest", "--mcp"]
    }
  }
}
```

Then ask, for example: "Create a Vue app with Pinia, Vue Router and Vitest in ~/projects".

Requires Node.js 22.12 or later.

## License

MIT
