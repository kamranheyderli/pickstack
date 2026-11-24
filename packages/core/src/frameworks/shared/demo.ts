import type { ProjectModel } from "../../types";
import plainCss from "./templates/plain-css";

/** Style slots used by every framework's demo app (counter card, nav, pages). */
export type ClassKey =
  | "main"
  | "title"
  | "nav"
  | "link"
  | "page"
  | "text"
  | "card"
  | "count"
  | "row"
  | "btn";

export type DemoClasses = Record<ClassKey, string>;

const tailwindClasses: DemoClasses = {
  main: "flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 p-8 text-slate-900",
  title: "text-3xl font-bold tracking-tight",
  nav: "flex gap-4 text-sm font-medium",
  link: "text-slate-600 hover:text-slate-900",
  page: "flex flex-col items-center gap-6",
  text: "max-w-md text-center text-slate-600",
  card: "rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200",
  count: "text-5xl font-bold tabular-nums",
  row: "mt-6 flex justify-center gap-3",
  btn: "rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700",
};

/** Class names matching `templates/plain-css.ts`. */
const plainClasses: DemoClasses = {
  main: "app",
  title: "title",
  nav: "nav",
  link: "link",
  page: "page",
  text: "text",
  card: "card",
  count: "count",
  row: "row",
  btn: "btn",
};

export function demoClasses(model: ProjectModel): DemoClasses {
  return model.styles.mode === "tailwind" ? tailwindClasses : plainClasses;
}

/** Global stylesheet: module `@import`s, the demo's plain CSS (unless utility-first), module CSS. */
export function globalCss(model: ProjectModel): string {
  const blocks = [
    model.styles.globalImports.join("\n"),
    model.styles.mode === "plain" ? plainCss.trimEnd() : "",
    model.styles.globalCss.join("\n\n"),
  ].filter(Boolean);
  return blocks.join("\n\n") + "\n";
}

export function aboutText(model: ProjectModel): string {
  return `Built with ${model.readme.stack.join(", ")}.`;
}
