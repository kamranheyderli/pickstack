import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Cross-origin isolation, which the live preview's StackBlitz WebContainer needs in Chromium.
 * `credentialless` still loads cross-origin images and fonts, without cookies. vercel.json
 * sends the same headers in production.
 */
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: isolation },
  preview: { headers: isolation },
  test: {
    name: "web",
    include: ["test/**/*.test.ts"],
  },
});
