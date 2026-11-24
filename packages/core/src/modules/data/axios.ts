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
  frameworks: ["react", "vue"],
  apply(model, ctx) {
    model.pkg.dependencies.add("axios");
    model.files.set(
      `src/api/client.${ctx.ext.script}`,
      file([
        'import axios from "axios";',
        "",
        "export const api = axios.create({",
        '  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",',
        "  timeout: 10_000,",
        "});",
      ]),
    );
    model.files.set(
      ".env.example",
      file(["VITE_API_URL=http://localhost:3000"]),
    );
    model.readme.stack.push("Axios");
    model.readme.sections.push({
      title: "API client",
      body: "Copy `.env.example` to `.env` and set `VITE_API_URL`. Import the client from `src/api/client`.",
    });
  },
};
