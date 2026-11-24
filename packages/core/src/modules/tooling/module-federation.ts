import { remoteApp } from "../../frameworks/shared/federation";
import type { Module } from "../../types";

/**
 * Micro-frontends with Module Federation (`@module-federation/vite`): the generated app becomes
 * the host and a remote app in `apps/remote` exposes a counter the host loads at runtime.
 * Both live in the Turborepo workspace, so `turbo run dev` serves them together.
 */
export const moduleFederation: Module = {
  id: "module-federation",
  name: "Module Federation",
  category: "tooling",
  description: {
    az: "Mikro-frontend: host tətbiq apps/remote-dan komponenti runtime-da yükləyir.",
    en: "Micro-frontends: the host loads a component from apps/remote at runtime.",
  },
  frameworks: ["react"],
  requires: ["turborepo"],
  order: 60,
  apply(model, ctx) {
    const monorepo = model.monorepo;
    if (!monorepo) throw new Error("module-federation requires turborepo");
    const spec = { hostPort: 5173, remotePort: 5174 };
    model.federation = spec;
    model.pkg.devDependencies.add("@module-federation/vite");
    monorepo.apps["remote"] = remoteApp(model, ctx, spec);
    // Host and remote are served together; `turbo run preview` builds then serves both.
    monorepo.preview = true;
    model.readme.stack.push("Module Federation");
    model.readme.sections.push({
      title: "Micro-frontends",
      body: [
        `\`apps/web\` is the Module Federation host (port ${spec.hostPort}); \`apps/remote\` exposes \`./Counter\` (port ${spec.remotePort}).`,
        "The dev and preview scripts serve both apps together. The host loads the remote at runtime, so the remote must be running: if it is unreachable, the host page stays blank.",
        "Before deploying, change `REMOTE_ORIGIN` in the remote's vite.config and the remote `entry` in the host's vite.config to the remote's real URL, and serve the remote with CORS headers.",
      ].join(" "),
    });
  },
};
