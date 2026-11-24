import { file } from "../../engine/code";
import type { Module } from "../../types";

export const axios: Module = {
  id: "axios",
  name: "Axios",
  category: "data",
  description: {
    az: "Hazır baseURL ilə HTTP klienti.",
    en: "HTTP client with a preconfigured base URL.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "sveltekit"],
  apply(model, ctx) {
    const env = ctx.env("API_URL");
    const clientPath = ctx.src(`api/client.${ctx.ext.script}`);
    model.pkg.dependencies.add("axios");
    model.files.set(
      clientPath,
      file([
        'import axios from "axios";',
        "",
        "export const api = axios.create({",
        `  baseURL: ${env.read} ?? "http://localhost:3000",`,
        "  timeout: 10_000,",
        "});",
      ]),
    );
    model.files.set(".env.example", file([`${env.key}=http://localhost:3000`]));
    model.readme.stack.push("Axios");
    model.readme.sections.push({
      title: "API client",
      body: `Copy \`.env.example\` to \`.env\` and set \`${env.key}\`. Import the client from \`${clientPath.replace(/\.\w+$/, "")}\`.`,
    });
  },
};
