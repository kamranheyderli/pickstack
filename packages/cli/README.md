# create-pickstack

Create a frontend project with the stack you pick: framework, UI kit, state, routing, data fetching, testing, linting, SEO and AI agent configs. Every combination it offers is checked with a real install, build, lint and test.

```bash
npm create pickstack@latest
pnpm create pickstack
yarn create pickstack
bun create pickstack
```

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
| `-y, --yes`            | don't ask; use defaults for anything not given                                               |
| `--no-install`         | skip installing dependencies                                                                 |
| `--no-git`             | skip `git init`                                                                              |
| `--list`               | list frameworks and modules                                                                  |

Requires Node.js 22.12 or later.

## License

MIT
