import { indent } from "../../engine/code";
import type { ImportSpec, ProjectModel } from "../../types";

/** Imports for the home page's widgets, from the components folder at `dir`. */
export function widgetImports(model: ProjectModel, dir: string): ImportSpec[] {
  return model.demo.widgets.map((name) => ({
    from: `${dir}/${name}`,
    default: name,
  }));
}

/** `<Widget />` elements after the counter, indented `depth` levels. */
export function widgetElements(model: ProjectModel, depth: number): string[] {
  return indent(
    model.demo.widgets.map((name) => `<${name} />`),
    depth,
  );
}
