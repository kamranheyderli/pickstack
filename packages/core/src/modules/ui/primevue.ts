import { raw } from "../../engine/code";
import type { Module } from "../../types";

/**
 * PrimeVue 4 in styled mode with the Aura preset. v4 rather than the latest v5: v5 moved to
 * the PrimeUI license (a license key is required beyond small teams), v4 is MIT. With
 * Tailwind, `tailwindcss-primeui` maps the theme to utilities and PrimeVue's styles go in a
 * `primevue` layer after Tailwind's base, so utilities win (PrimeVue's Tailwind guide).
 */
export const primevue: Module = {
  id: "primevue",
  name: "PrimeVue",
  category: "ui",
  description: {
    az: "90+ hazır komponent, Aura temasında (v4, MIT).",
    en: "90+ ready-made components with the Aura theme (v4, MIT).",
    ru: "90+ готовых компонентов с темой Aura (v4, MIT).",
  },
  frameworks: ["vue", "nuxt"],
  apply(model, ctx) {
    const nuxt = ctx.selection.framework === "nuxt";
    const tailwind = model.styles.mode === "tailwind";
    model.pkg.dependencies.add("primevue").add("@primeuix/themes");

    const theme = {
      preset: raw("Aura"),
      ...(tailwind
        ? {
            options: {
              cssLayer: { name: "primevue", order: "theme, base, primevue" },
            },
          }
        : {}),
    };
    const aura = { from: "@primeuix/themes/aura", default: "Aura" };
    if (nuxt) {
      model.pkg.devDependencies.add("@primevue/nuxt-module");
      model.bundler.modules.push("@primevue/nuxt-module");
      model.bundler.configImports.push(aura);
      model.bundler.config["primevue"] = { options: { theme } };
    } else {
      model.entry.imports.push(aura, {
        from: "primevue/config",
        default: "PrimeVue",
      });
      model.entry.appUses.push(
        `PrimeVue, { theme: { preset: Aura${tailwind ? ', options: { cssLayer: { name: "primevue", order: "theme, base, primevue" } }' : ""} } }`,
      );
    }

    if (tailwind) {
      model.pkg.devDependencies.add("tailwindcss-primeui");
      model.styles.globalImports.push('@import "tailwindcss-primeui";');
    } else {
      model.styles.globalCss.push(
        [
          ".counter {",
          "  width: 18rem;",
          "  text-align: center;",
          "}",
          "",
          ".actions {",
          "  display: flex;",
          "  justify-content: center;",
          "  gap: 0.75rem;",
          "}",
        ].join("\n"),
      );
    }
    const cls = tailwind
      ? {
          card: "w-72 text-center",
          count: "text-5xl font-bold tabular-nums",
          actions: "flex justify-center gap-3",
        }
      : { card: "counter", count: "count", actions: "actions" };

    model.demo.view = {
      imports: [
        { from: "primevue/button", default: "Button" },
        { from: "primevue/card", default: "Card" },
      ],
      markup: (c) => [
        `<Card class="${cls.card}">`,
        "  <template #title>Counter</template>",
        "  <template #content>",
        `    <p class="${cls.count}">{{ ${c.value} }}</p>`,
        "  </template>",
        "  <template #footer>",
        `    <div class="${cls.actions}">`,
        `      <Button label="-1" severity="secondary" outlined @click="${c.decrement}" />`,
        `      <Button label="+1" @click="${c.increment}" />`,
        "    </div>",
        "  </template>",
        "</Card>",
      ],
      testHarness: {
        imports: [{ from: "primevue/config", default: "PrimeVue" }],
        plugins: ["PrimeVue"],
      },
    };
    model.readme.stack.push("PrimeVue");
  },
};
