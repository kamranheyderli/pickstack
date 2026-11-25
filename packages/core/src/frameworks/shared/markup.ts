/**
 * Minimal markup builder that prints simple trees the way prettier-plugin-astro does, for
 * files core cannot run Prettier on. Rules observed from the plugin (prettier 3.10, plugin 1.1):
 * - an opening tag with a single attribute never breaks; with more, attributes go one per
 *   line only when the tag does not fit in 80 columns;
 * - text content stays inline only for elements with at most one attribute and a line that
 *   fits; otherwise the text goes on its own line.
 * Biome's HTML formatter keeps text inline whenever the line fits, whatever the attributes,
 * and breaks an opening tag that does not fit even with a single attribute.
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

export type MarkupStyle = "prettier" | "biome";

/** Text on its own lines: both Prettier and Biome fill words up to the print width. */
function fill(text: string, indent: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && (indent + next).length > WIDTH) {
      lines.push(indent + line);
      line = word;
    } else line = next;
  }
  return [...lines, indent + line];
}

export function printMarkup(
  node: El | string,
  depth = 0,
  style: MarkupStyle = "prettier",
): string[] {
  const pad = "  ".repeat(depth);
  if (typeof node === "string") return [pad + node];
  const attrs = node.attrs ?? [];
  const inlineOpen = `<${[node.tag, ...attrs].join(" ")}`;
  const brokenOpen = [
    `${pad}<${node.tag}`,
    ...attrs.map((a) => `${pad}  ${a}`),
  ];

  // Prettier never breaks a single attribute; Biome breaks any opening tag that does not fit.
  const minAttrs = style === "biome" ? 1 : 2;
  const breaks = (line: string) =>
    line.length > WIDTH && attrs.length >= minAttrs;

  if (node.selfClosing || node.children === undefined) {
    const line = `${pad}${inlineOpen} />`;
    return breaks(line) ? [...brokenOpen, `${pad}/>`] : [line];
  }

  const close = `</${node.tag}>`;
  const open = `${pad}${inlineOpen}>`;
  const head = breaks(open) ? [...brokenOpen, `${pad}>`] : [open];
  if (typeof node.children === "string") {
    // Text stays inline when the line fits (for Prettier, only with at most one attribute).
    const line = `${pad}${inlineOpen}>${node.children}${close}`;
    const fewAttrs = style === "biome" || attrs.length <= 1;
    if (fewAttrs && line.length <= WIDTH) return [line];
    return [...head, ...fill(node.children, `${pad}  `), `${pad}${close}`];
  }

  return [
    ...head,
    ...node.children.flatMap((child) => printMarkup(child, depth + 1, style)),
    `${pad}${close}`,
  ];
}
