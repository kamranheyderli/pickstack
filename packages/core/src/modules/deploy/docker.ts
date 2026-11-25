import { file } from "../../engine/code";
import { deploy } from "../../versions/known-good";
import type { Ctx, Module, PackageManager } from "../../types";
import { DEPLOY_CONFLICTS, isSpa, staticOutput } from "./shared";

const lockfiles: Record<PackageManager, string> = {
  npm: "package-lock.json",
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
  bun: "bun.lock",
};

/**
 * The build stage: install and build with the project's package manager. The lockfile is
 * optional (`*`) because a fresh project has none yet, so installs aren't frozen.
 */
function buildStage(pm: PackageManager, extra: string[] = []): string[] {
  const run = pm === "npm" ? "npm run build" : `${pm} run build`;
  return [
    `FROM ${pm === "bun" ? deploy.bun : deploy.node} AS build`,
    "WORKDIR /app",
    ...(pm === "pnpm" ? [`RUN npm install -g pnpm@${deploy.pnpm}`] : []),
    `COPY package.json ${lockfiles[pm]}* ./`,
    `RUN ${pm} install`,
    "COPY . .",
    ...extra,
    `RUN ${run}`,
  ];
}

function staticDockerfile(ctx: Ctx): string {
  return file([
    "# syntax=docker/dockerfile:1",
    "",
    ...buildStage(ctx.selection.packageManager),
    "",
    `FROM ${deploy.nginx}`,
    "COPY nginx.conf /etc/nginx/conf.d/default.conf",
    `COPY --from=build /app/${staticOutput(ctx)} /usr/share/nginx/html`,
    "EXPOSE 80",
  ]);
}

function nginxConf(spa: boolean, assets: string | null): string {
  return file([
    "server {",
    "  listen 80;",
    "  server_name _;",
    "  root /usr/share/nginx/html;",
    "  index index.html;",
    ...(assets
      ? [
          "",
          "  # Hashed file names change with every build, so they can be cached for good.",
          `  location /${assets}/ {`,
          "    expires 1y;",
          '    add_header Cache-Control "public, immutable";',
          "  }",
        ]
      : []),
    "",
    "  location / {",
    spa
      ? "    try_files $uri $uri/ /index.html;"
      : "    try_files $uri $uri.html $uri/ =404;",
    "  }",
    ...(spa ? [] : ["", "  error_page 404 /404.html;"]),
    "}",
  ]);
}

function nodeRuntime(port: string[], copy: string[], cmd: string): string[] {
  return [
    `FROM ${deploy.node}`,
    "WORKDIR /app",
    "ENV NODE_ENV=production",
    ...port,
    ...copy,
    "USER node",
    "EXPOSE 3000",
    `CMD ${cmd}`,
  ];
}

/** Installs only `dependencies`, which adapter-node leaves out of its bundle. */
const prodInstall: Record<PackageManager, string> = {
  npm: "npm install --omit=dev",
  pnpm: "pnpm install --prod",
  yarn: "yarn install --production",
  bun: "bun install --production",
};

function depsStage(pm: PackageManager): string[] {
  return [
    `FROM ${pm === "bun" ? deploy.bun : deploy.node} AS deps`,
    "WORKDIR /app",
    ...(pm === "pnpm" ? [`RUN npm install -g pnpm@${deploy.pnpm}`] : []),
    `COPY package.json ${lockfiles[pm]}* ./`,
    `RUN ${prodInstall[pm]}`,
  ];
}

const dockerignore = file([
  "node_modules",
  "dist",
  "build",
  ".output",
  ".nuxt",
  ".next",
  ".svelte-kit",
  ".astro",
  ".angular",
  ".git",
  ".env",
  ".env.*",
  "!.env.example",
  "*.log",
  "Dockerfile",
  ".dockerignore",
]);

/** Hashed asset folders for the long-lived cache rule (null: names aren't hashed by folder). */
function assetsDir(ctx: Ctx): string | null {
  switch (ctx.selection.framework) {
    case "angular":
      return null;
    case "sveltekit":
      return "_app/immutable";
    case "astro":
      return "_astro";
    default:
      return "assets";
  }
}

/**
 * A multi-stage Dockerfile: static sites are served by nginx (with the SPA fallback where
 * routes live in the client); Next.js runs its standalone server and Nuxt its Nitro server.
 */
export const docker: Module = {
  id: "docker",
  name: "Docker",
  category: "deploy",
  description: {
    az: "Multi-stage Dockerfile: statik saytlar nginx ilə, server tələb edən tətbiqlər Node ilə.",
    en: "Multi-stage Dockerfile: nginx for static sites, a Node server for apps that need one.",
  },
  frameworks: "all",
  conflicts: DEPLOY_CONFLICTS,
  apply(model, ctx) {
    const pm = ctx.selection.packageManager;
    const { framework } = ctx.selection;
    let dockerfile: string;
    let port = "8080:80";

    if (framework === "next") {
      // The standalone build holds only the files the server needs, with a server.js.
      model.bundler.config["output"] = "standalone";
      port = "3000:3000";
      dockerfile = file([
        "# syntax=docker/dockerfile:1",
        "",
        // The runtime stage copies public/, which a project may not have yet.
        ...buildStage(pm, ["RUN mkdir -p public"]),
        "",
        ...nodeRuntime(
          ["ENV PORT=3000", "ENV HOSTNAME=0.0.0.0"],
          [
            "COPY --from=build --chown=node:node /app/public ./public",
            "COPY --from=build --chown=node:node /app/.next/standalone ./",
            "COPY --from=build --chown=node:node /app/.next/static ./.next/static",
          ],
          '["node", "server.js"]',
        ),
      ]);
    } else if (framework === "nuxt") {
      port = "3000:3000";
      dockerfile = file([
        "# syntax=docker/dockerfile:1",
        "",
        ...buildStage(pm),
        "",
        ...nodeRuntime(
          ["ENV HOST=0.0.0.0", "ENV PORT=3000"],
          ["COPY --from=build --chown=node:node /app/.output ./.output"],
          '["node", ".output/server/index.mjs"]',
        ),
      ]);
    } else if (framework === "sveltekit" && model.needsServer) {
      // adapter-node bundles devDependencies; `dependencies` come from node_modules.
      port = "3000:3000";
      dockerfile = file([
        "# syntax=docker/dockerfile:1",
        "",
        ...buildStage(pm),
        "",
        ...depsStage(pm),
        "",
        ...nodeRuntime(
          ["ENV HOST=0.0.0.0", "ENV PORT=3000"],
          [
            "COPY --from=deps --chown=node:node /app/node_modules ./node_modules",
            "COPY --from=build --chown=node:node /app/build ./build",
            "COPY --chown=node:node package.json ./",
          ],
          '["node", "build"]',
        ),
      ]);
    } else {
      dockerfile = staticDockerfile(ctx);
      model.files.set(
        "nginx.conf",
        // SPAs answer every path with index.html; static sites serve the page's .html file.
        nginxConf(isSpa(ctx), assetsDir(ctx)),
      );
    }

    model.files.set("Dockerfile", dockerfile);
    model.files.set(".dockerignore", dockerignore);
    model.readme.sections.push({
      title: "Docker",
      body: [
        "```sh",
        `docker build -t ${ctx.selection.name} .`,
        `docker run --rm -p ${port} ${ctx.selection.name}`,
        "```",
        "",
        `Then open http://localhost:${port.split(":")[0]}.`,
      ].join("\n"),
    });
  },
};
