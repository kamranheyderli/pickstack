import { file } from "../../engine/code";
import type { Module } from "../../types";

export const pinia: Module = {
  id: "pinia",
  name: "Pinia",
  category: "state",
  description: {
    az: "Vue üçün rəsmi store; setup store sintaksisi.",
    en: "The official Vue store, using setup-store syntax.",
  },
  frameworks: ["vue", "nuxt"],
  order: 10,
  apply(model, ctx) {
    model.pkg.dependencies.add("pinia");
    // Required peer of pinia 4; listed explicitly because yarn does not install peers.
    model.pkg.dependencies.add("@vue/devtools-api");
    model.files.set(
      ctx.src(`stores/counter.${ctx.ext.script}`),
      file([
        'import { defineStore } from "pinia";',
        'import { ref } from "vue";',
        "",
        'export const useCounterStore = defineStore("counter", () => {',
        "  const count = ref(0);",
        "",
        "  function increment() {",
        "    count.value++;",
        "  }",
        "",
        "  function decrement() {",
        "    count.value--;",
        "  }",
        "",
        "  return { count, increment, decrement };",
        "});",
      ]),
    );
    const nuxt = ctx.selection.framework === "nuxt";
    if (nuxt) {
      // @pinia/nuxt installs Pinia and auto-imports stores from app/stores.
      model.pkg.dependencies.add("@pinia/nuxt");
      model.bundler.modules.push("@pinia/nuxt");
    } else {
      model.entry.imports.push({ from: "pinia", named: ["createPinia"] });
      model.entry.appUses.push("createPinia()");
    }
    model.demo.counter = {
      imports: [
        {
          from: nuxt ? "~/stores/counter" : "@/stores/counter",
          named: ["useCounterStore"],
        },
      ],
      setup: ["const counter = useCounterStore();"],
      value: "counter.count",
      increment: "counter.increment()",
      decrement: "counter.decrement()",
    };
    model.readme.stack.push("Pinia");
  },
};
