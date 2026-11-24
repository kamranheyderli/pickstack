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
  frameworks: ["vue"],
  order: 10,
  apply(model, ctx) {
    model.pkg.dependencies.add("pinia");
    // Required peer of pinia 4; listed explicitly because yarn does not install peers.
    model.pkg.dependencies.add("@vue/devtools-api");
    model.files.set(
      `src/stores/counter.${ctx.ext.script}`,
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
    model.entry.imports.push({ from: "pinia", named: ["createPinia"] });
    model.entry.appUses.push("createPinia()");
    model.demo.counter = {
      imports: [{ from: "@/stores/counter", named: ["useCounterStore"] }],
      setup: ["const counter = useCounterStore();"],
      value: "counter.count",
      increment: "counter.increment()",
      decrement: "counter.decrement()",
    };
    model.readme.stack.push("Pinia");
  },
};
