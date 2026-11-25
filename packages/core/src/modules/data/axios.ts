import { file } from "../../engine/code";
import type { Ctx, Module, ProjectModel } from "../../types";

const DEFAULT_URL = "http://localhost:3000";

/**
 * Axios client with a configurable base URL. How the URL is configured follows each
 * framework: public env vars (Vite, Next, Astro), Nuxt runtimeConfig, Angular environments.
 */
export const axios: Module = {
  id: "axios",
  name: "Axios",
  category: "data",
  description: {
    az: "Əvvəlcədən qurulmuş baseURL ilə HTTP klienti.",
    en: "HTTP client with a preconfigured base URL.",
  },
  frameworks: "all",
  apply(model, ctx) {
    model.pkg.dependencies.add("axios");
    switch (ctx.selection.framework) {
      case "nuxt":
        nuxtPlugin(model, ctx);
        break;
      case "angular":
        angularClient(model);
        break;
      default:
        envClient(model, ctx);
    }
    model.readme.stack.push("Axios");
  },
};

function envClient(model: ProjectModel, ctx: Ctx): void {
  const env = ctx.env("API_URL");
  const clientPath = ctx.src(`api/client.${ctx.ext.script}`);
  model.files.set(
    clientPath,
    file([
      'import axios from "axios";',
      "",
      "export const api = axios.create({",
      `  baseURL: ${env.read} ?? "${DEFAULT_URL}",`,
      "  timeout: 10_000,",
      "});",
    ]),
  );
  model.env[env.key] = DEFAULT_URL;
  model.readme.sections.push({
    title: "API client",
    body: `Copy \`.env.example\` to \`.env\` and set \`${env.key}\`. Import the client from \`${clientPath.replace(/\.\w+$/, "")}\`.`,
  });
}

/** Nuxt reads config through runtimeConfig; a plugin exposes the client as `$api`. */
function nuxtPlugin(model: ProjectModel, ctx: Ctx): void {
  model.bundler.config["runtimeConfig"] = { public: { apiUrl: DEFAULT_URL } };
  model.files.set(
    ctx.src(`plugins/api.${ctx.ext.script}`),
    file([
      'import axios from "axios";',
      "",
      "export default defineNuxtPlugin(() => {",
      "  const config = useRuntimeConfig();",
      "  const api = axios.create({",
      "    baseURL: config.public.apiUrl,",
      "    timeout: 10_000,",
      "  });",
      "",
      "  return { provide: { api } };",
      "});",
    ]),
  );
  model.env["NUXT_PUBLIC_API_URL"] = DEFAULT_URL;
  model.readme.sections.push({
    title: "API client",
    body: "Set `NUXT_PUBLIC_API_URL` (see `.env.example`). Use the client via `const { $api } = useNuxtApp()`.",
  });
}

/** Angular has no public env vars; the base URL lives in an environment file. */
function angularClient(model: ProjectModel): void {
  model.files.set(
    "src/environments/environment.ts",
    file(["export const environment = {", `  apiUrl: "${DEFAULT_URL}",`, "};"]),
  );
  model.files.set(
    "src/app/api/client.ts",
    file([
      'import axios from "axios";',
      'import { environment } from "../../environments/environment";',
      "",
      "export const api = axios.create({",
      "  baseURL: environment.apiUrl,",
      "  timeout: 10_000,",
      "});",
    ]),
  );
  model.readme.sections.push({
    title: "API client",
    body: "Set `apiUrl` in `src/environments/environment.ts`. Import the client from `src/app/api/client`.",
  });
}
