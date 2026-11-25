import { file } from "../../engine/code";
import type { Module } from "../../types";

/**
 * Vuetify 4 (Material Design), following its installation guide: a `createVuetify()` plugin,
 * `vite-plugin-vuetify` for component auto-import, Material Design Icons, and the app inside
 * `<v-app>`. On Nuxt it is the guide's manual setup (the Nuxt module is still a release
 * candidate and warns about a duplicate `useLayout` auto-import).
 */
export const vuetify: Module = {
  id: "vuetify",
  name: "Vuetify",
  category: "ui",
  description: {
    az: "Material Design komponentləri (v4).",
    en: "Material Design component framework (v4).",
  },
  frameworks: ["vue", "nuxt"],
  apply(model, ctx) {
    const nuxt = ctx.selection.framework === "nuxt";
    model.pkg.dependencies.add("vuetify").add("@mdi/font");
    model.pkg.devDependencies.add("vite-plugin-vuetify");
    model.bundler.plugins.push({
      import: { from: "vite-plugin-vuetify", default: "vuetify" },
      call: "vuetify({ autoImport: true })",
    });

    const styles = [
      'import "@mdi/font/css/materialdesignicons.css";',
      'import "vuetify/styles";',
      'import { createVuetify } from "vuetify";',
      "",
    ];
    if (nuxt) {
      model.bundler.config["build"] = { transpile: ["vuetify"] };
      model.files.set(
        `app/plugins/vuetify.${ctx.ext.script}`,
        file([
          ...styles,
          "export default defineNuxtPlugin((nuxtApp) => {",
          "  const vuetify = createVuetify({ ssr: true });",
          "",
          "  nuxtApp.vueApp.use(vuetify);",
          "});",
        ]),
      );
    } else {
      model.files.set(
        `src/plugins/vuetify.${ctx.ext.script}`,
        file([...styles, "export default createVuetify();"]),
      );
      model.entry.imports.push({
        from: "./plugins/vuetify",
        default: "vuetify",
      });
      model.entry.appUses.push("vuetify");
    }

    if (model.styles.mode === "tailwind") {
      model.warnings.push(
        "Vuetify and Tailwind CSS both ship resets and utilities in CSS layers that override each other. Vuetify's Tailwind guide (vuetifyjs.com/en/features/css-utilities/tailwindcss/) shows how to order the layers.",
      );
    }

    model.demo.view = {
      imports: [],
      markup: (c) => [
        '<v-card class="text-center" width="288">',
        "  <v-card-item>",
        "    <v-card-title>Counter</v-card-title>",
        "  </v-card-item>",
        "  <v-card-text>",
        `    <p class="text-display-medium font-weight-bold">{{ ${c.value} }}</p>`,
        "  </v-card-text>",
        '  <v-card-actions class="justify-center">',
        `    <v-btn variant="outlined" @click="${c.decrement}">-1</v-btn>`,
        `    <v-btn color="primary" variant="flat" @click="${c.increment}">+1</v-btn>`,
        "  </v-card-actions>",
        "</v-card>",
      ],
      appShell: {
        open: ["<v-app>", "  <v-main>"],
        close: ["  </v-main>", "</v-app>"],
      },
      testHarness: {
        imports: [{ from: "vuetify", named: ["createVuetify"] }],
        plugins: ["createVuetify()"],
        // Vuetify's components import their CSS, which Node cannot load unbundled.
        inlineDeps: ["vuetify"],
      },
    };
    model.readme.stack.push("Vuetify");
  },
};
