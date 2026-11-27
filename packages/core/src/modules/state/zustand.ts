import { file } from "../../engine/code";
import type { Module } from "../../types";

export const zustand: Module = {
  id: "zustand",
  name: "Zustand",
  category: "state",
  description: {
    az: "Provider tələb etməyən, minimal hook əsaslı store.",
    en: "Minimal hook-based store, no provider needed.",
    ru: "Минималистичное хранилище на хуках, без провайдера.",
  },
  frameworks: ["react", "next"],
  apply(model, ctx) {
    model.pkg.dependencies.add("zustand");
    model.files.set(
      ctx.src(`store/useCounterStore.${ctx.ext.script}`),
      file([
        'import { create } from "zustand";',
        "",
        ...(ctx.isTs
          ? [
              "interface CounterState {",
              "  count: number;",
              "  increment: () => void;",
              "  decrement: () => void;",
              "}",
              "",
            ]
          : []),
        `export const useCounterStore = create${ctx.isTs ? "<CounterState>()" : ""}((set) => ({`,
        "  count: 0,",
        "  increment: () => set((state) => ({ count: state.count + 1 })),",
        "  decrement: () => set((state) => ({ count: state.count - 1 })),",
        "}));",
      ]),
    );
    model.demo.counter = {
      imports: [
        { from: "../store/useCounterStore", named: ["useCounterStore"] },
      ],
      setup: [
        "const count = useCounterStore((state) => state.count);",
        "const increment = useCounterStore((state) => state.increment);",
        "const decrement = useCounterStore((state) => state.decrement);",
      ],
      value: "count",
      increment: "increment",
      decrement: "decrement",
    };
    model.readme.stack.push("Zustand");
  },
};
