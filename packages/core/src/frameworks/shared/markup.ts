/**
 * Minimal markup builder that prints simple trees the way prettier-plugin-astro does, for
 * files core cannot run Prettier on. Rules observed from the plugin (prettier 3.10, plugin 1.1):
 * - an opening tag with a single attribute never breaks; with more, attributes go one per
 *   line only when the tag does not fit in 80 columns;
 * - text content stays inline only for elements with at most one attribute and a line that
 *   fits; otherwise the text goes on its own line.
 */
export interface El {
  tag: string;
  attrs?: string[];
  /** Text content, or child elements. Omit for void/self-closing elements. */
  children?: string | (El | string)[];
  selfClosing?: boolean;
}

const WIDTH = 80;

export function el(
  tag: string,
  attrs: string[] = [],
  children?: El["children"],
): El {
  return { tag, attrs, children };
}

export function printMarkup(node: El | string, depth = 0): string[] {
  const pad = "  ".repeat(depth);
  if (typeof node === "string") return [pad + node];
  const attrs = node.attrs ?? [];
  const inlineOpen = `<${[node.tag, ...attrs].join(" ")}`;
  const brokenOpen = [
    `${pad}<${node.tag}`,
    ...attrs.map((a) => `${pad}  ${a}`),
  ];

  // A single attribute never breaks the opening tag; several do when it does not fit.
  const breaks = (line: string) => line.length > WIDTH && attrs.length > 1;

  if (node.selfClosing || node.children === undefined) {
    const line = `${pad}${inlineOpen} />`;
    return breaks(line) ? [...brokenOpen, `${pad}/>`] : [line];
  }

  const close = `</${node.tag}>`;
  const open = `${pad}${inlineOpen}>`;
  const head = breaks(open) ? [...brokenOpen, `${pad}>`] : [open];
  if (typeof node.children === "string") {
    // Text stays inline only with at most one attribute and a line that fits.
    const line = `${pad}${inlineOpen}>${node.children}${close}`;
    if (attrs.length <= 1 && line.length <= WIDTH) return [line];
    return [...head, `${pad}  ${node.children}`, `${pad}${close}`];
  }

  return [
    ...head,
    ...node.children.flatMap((child) => printMarkup(child, depth + 1)),
    `${pad}${close}`,
  ];
}
