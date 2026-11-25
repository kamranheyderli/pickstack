import { remoteApp } from "../../frameworks/shared/federation";
import type { Module } from "../../types";

const HOST_PORT = 5173;
const REMOTE_PORT = 5174;

/**
 * Micro-frontends with Module Federation (`@module-federation/vite`): the generated app becomes
 * the host and a remote project exposes a counter the host loads at runtime. They are written
 * as two independent projects (`host/`, `remote/`), each with its own install and repository,
 * because micro-frontends are built and deployed separately.
 */
export const moduleFederation: Module = {
  id: "module-federation",
  name: "Module Federation",
  category: "tooling",
  description: {
    az: "Mikro-frontend: host və remote iki ayrı layihədir, komponent icra zamanı yüklənir.",
    en: "Micro-frontends: host and remote as separate projects, loaded at runtime.",
  },
  frameworks: ["react"],
  // A workspace would tie together projects that are meant to ship independently.
  conflicts: ["turborepo"],
  apply(model, ctx) {
    model.federation = {
      hostPort: HOST_PORT,
      remotePort: REMOTE_PORT,
      remote: remoteApp(model, ctx, { remotePort: REMOTE_PORT }),
    };
    model.pkg.devDependencies.add("@module-federation/vite");
    model.readme.stack.push("Module Federation");
    model.readme.sections.push({
      title: "Micro-frontends",
      body: [
        `This is the Module Federation host (port ${HOST_PORT}). It loads \`Counter\` from the remote project at runtime (\`http://localhost:${REMOTE_PORT}/remoteEntry.js\`), so start the remote first: if it is unreachable, this page stays blank.`,
        "Before deploying, point the remote `entry` in vite.config at the remote's real URL.",
      ].join(" "),
    });
  },
};
