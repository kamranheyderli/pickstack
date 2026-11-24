import { file } from "../../engine/code";
import type { Ctx, Module } from "../../types";

/**
 * Redux Toolkit. In a Vite SPA the store is a module singleton; in Next.js App Router the store
 * is created per request through `makeStore` inside a client `StoreProvider` (redux.js.org/usage/nextjs).
 */
export const reduxToolkit: Module = {
  id: "redux-toolkit",
  name: "Redux Toolkit",
  category: "state",
  description: {
    az: "Mərkəzi store, slice-lar və typed hook-lar.",
    en: "Central store with slices and typed hooks.",
  },
  frameworks: ["react", "next"],
  order: 10,
  apply(model, ctx) {
    model.pkg.dependencies.add("@reduxjs/toolkit").add("react-redux");
    const next = ctx.selection.framework === "next";
    const dir = next ? "lib" : "src/store";
    const fromCounter = next ? "../lib" : "../store";
    const ext = ctx.ext.script;

    model.files.set(`${dir}/counterSlice.${ext}`, counterSlice(ctx));
    model.files.set(
      `${dir}/${next ? "store" : "index"}.${ext}`,
      next ? makeStore(ctx) : singletonStore(ctx),
    );
    if (ctx.isTs)
      model.files.set(
        `${dir}/hooks.ts`,
        typedHooks(next ? "./store" : "./index"),
      );

    if (next) {
      model.files.set(
        `app/StoreProvider.${ctx.ext.component}`,
        storeProvider(ctx),
      );
      model.entry.providers.push({
        id: "redux",
        open: "<StoreProvider>",
        close: "</StoreProvider>",
        imports: [{ from: "./StoreProvider", default: "StoreProvider" }],
        order: 10,
      });
    } else {
      model.entry.providers.push({
        id: "redux",
        open: "<Provider store={store}>",
        close: "</Provider>",
        imports: [
          { from: "react-redux", named: ["Provider"] },
          { from: "./store", named: ["store"] },
        ],
        order: 10,
      });
    }

    model.demo.counter = {
      imports: [
        ctx.isTs
          ? {
              from: `${fromCounter}/hooks`,
              named: ["useAppDispatch", "useAppSelector"],
            }
          : { from: "react-redux", named: ["useDispatch", "useSelector"] },
        {
          from: `${fromCounter}/counterSlice`,
          named: ["decrement", "increment"],
        },
      ],
      setup: ctx.isTs
        ? [
            "const count = useAppSelector((state) => state.counter.value);",
            "const dispatch = useAppDispatch();",
          ]
        : [
            "const count = useSelector((state) => state.counter.value);",
            "const dispatch = useDispatch();",
          ],
      value: "count",
      increment: "() => dispatch(increment())",
      decrement: "() => dispatch(decrement())",
      testHarness: next
        ? {
            imports: [
              { from: "../app/StoreProvider", default: "StoreProvider" },
            ],
            wrapper: { open: "<StoreProvider>", close: "</StoreProvider>" },
          }
        : {
            imports: [
              { from: "react-redux", named: ["Provider"] },
              { from: "../store", named: ["store"] },
            ],
            wrapper: { open: "<Provider store={store}>", close: "</Provider>" },
          },
    };
    model.readme.stack.push("Redux Toolkit");
  },
};

function counterSlice(ctx: Ctx): string {
  return file([
    'import { createSlice } from "@reduxjs/toolkit";',
    "",
    ...(ctx.isTs
      ? [
          "interface CounterState {",
          "  value: number;",
          "}",
          "",
          "const initialState: CounterState = { value: 0 };",
        ]
      : ["const initialState = { value: 0 };"]),
    "",
    "const counterSlice = createSlice({",
    '  name: "counter",',
    "  initialState,",
    "  reducers: {",
    "    increment: (state) => {",
    "      state.value += 1;",
    "    },",
    "    decrement: (state) => {",
    "      state.value -= 1;",
    "    },",
    "  },",
    "});",
    "",
    "export const { increment, decrement } = counterSlice.actions;",
    "export default counterSlice.reducer;",
  ]);
}

function singletonStore(ctx: Ctx): string {
  return file([
    'import { configureStore } from "@reduxjs/toolkit";',
    'import counterReducer from "./counterSlice";',
    "",
    "export const store = configureStore({",
    "  reducer: {",
    "    counter: counterReducer,",
    "  },",
    "});",
    ...(ctx.isTs
      ? [
          "",
          "export type RootState = ReturnType<typeof store.getState>;",
          "export type AppDispatch = typeof store.dispatch;",
        ]
      : []),
  ]);
}

function makeStore(ctx: Ctx): string {
  return file([
    'import { configureStore } from "@reduxjs/toolkit";',
    'import counterReducer from "./counterSlice";',
    "",
    "export const makeStore = () =>",
    "  configureStore({",
    "    reducer: {",
    "      counter: counterReducer,",
    "    },",
    "  });",
    ...(ctx.isTs
      ? [
          "",
          "export type AppStore = ReturnType<typeof makeStore>;",
          'export type RootState = ReturnType<AppStore["getState"]>;',
          'export type AppDispatch = AppStore["dispatch"];',
        ]
      : []),
  ]);
}

function typedHooks(storeModule: string): string {
  return file([
    'import { useDispatch, useSelector } from "react-redux";',
    `import type { AppDispatch, RootState } from "${storeModule}";`,
    "",
    "export const useAppDispatch = useDispatch.withTypes<AppDispatch>();",
    "export const useAppSelector = useSelector.withTypes<RootState>();",
  ]);
}

function storeProvider(ctx: Ctx): string {
  return file([
    '"use client";',
    "",
    ...(ctx.isTs
      ? [
          'import { useState, type ReactNode } from "react";',
          'import { Provider } from "react-redux";',
          'import { makeStore, type AppStore } from "../lib/store";',
          "",
          "export default function StoreProvider({ children }: { children: ReactNode }) {",
          "  const [store] = useState<AppStore>(makeStore);",
        ]
      : [
          'import { useState } from "react";',
          'import { Provider } from "react-redux";',
          'import { makeStore } from "../lib/store";',
          "",
          "export default function StoreProvider({ children }) {",
          "  const [store] = useState(makeStore);",
        ]),
    "  return <Provider store={store}>{children}</Provider>;",
    "}",
  ]);
}
