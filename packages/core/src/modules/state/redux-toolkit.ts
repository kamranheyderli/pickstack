import { file } from "../../engine/code";
import type { Ctx, Module, ProjectModel } from "../../types";

export const reduxToolkit: Module = {
  id: "redux-toolkit",
  name: "Redux Toolkit",
  category: "state",
  description: {
    az: "Mərkəzi store, slice-lar və typed hook-lar.",
    en: "Central store with slices and typed hooks.",
  },
  frameworks: ["react"],
  order: 10,
  apply(model, ctx) {
    model.pkg.dependencies.add("@reduxjs/toolkit");
    model.pkg.dependencies.add("react-redux");
    writeStore(model, ctx);
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
    model.demo.counter = ctx.isTs
      ? {
          imports: [
            {
              from: "../store/hooks",
              named: ["useAppDispatch", "useAppSelector"],
            },
            {
              from: "../store/counterSlice",
              named: ["decrement", "increment"],
            },
          ],
          setup: [
            "const count = useAppSelector((state) => state.counter.value);",
            "const dispatch = useAppDispatch();",
          ],
          value: "count",
          increment: "() => dispatch(increment())",
          decrement: "() => dispatch(decrement())",
        }
      : {
          imports: [
            { from: "react-redux", named: ["useDispatch", "useSelector"] },
            {
              from: "../store/counterSlice",
              named: ["decrement", "increment"],
            },
          ],
          setup: [
            "const count = useSelector((state) => state.counter.value);",
            "const dispatch = useDispatch();",
          ],
          value: "count",
          increment: "() => dispatch(increment())",
          decrement: "() => dispatch(decrement())",
        };
    model.readme.stack.push("Redux Toolkit");
  },
};

function writeStore(model: ProjectModel, ctx: Ctx): void {
  const ext = ctx.ext.script;
  model.files.set(
    `src/store/index.${ext}`,
    file([
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
    ]),
  );

  model.files.set(
    `src/store/counterSlice.${ext}`,
    file([
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
    ]),
  );

  if (ctx.isTs) {
    model.files.set(
      "src/store/hooks.ts",
      file([
        'import { useDispatch, useSelector } from "react-redux";',
        'import type { AppDispatch, RootState } from "./index";',
        "",
        "export const useAppDispatch = useDispatch.withTypes<AppDispatch>();",
        "export const useAppSelector = useSelector.withTypes<RootState>();",
      ]),
    );
  }
}
