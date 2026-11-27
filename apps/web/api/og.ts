import { readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import satori from "satori";
import type { SimpleIcon } from "simple-icons";
import { frameworkIcons, moduleIcons } from "../src/lib/brand-icons.js";
import { moduleName, stackFromQuery } from "./_stack.js";

/**
 * The share image for a stack link (1200×630): the framework, the picked modules with their
 * marks, and the command that creates the project. Satori lays out plain element objects (so
 * this file needs no JSX transform) into an SVG, and resvg turns that into the PNG link previews
 * need. (@vercel/og wraps the same two, but its published builds lack the hb.wasm they load.)
 */

/** Geist, the site's typeface (SIL OFL), shipped with the function: satori needs TTF files. */
const fonts = [400, 700].map((weight) => ({
  name: "Geist",
  weight: weight as 400 | 700,
  style: "normal" as const,
  data: readFileSync(new URL(`./_fonts/Geist-${weight}.ttf`, import.meta.url)),
}));
type Child = Node | string;
interface Node {
  type: string;
  props: Record<string, unknown>;
}

const h = (
  type: string,
  style: Record<string, string | number>,
  ...children: Child[]
): Node => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

const colors = {
  bg: "#0b0b10",
  panel: "#16151d",
  line: "#2b2936",
  ink: "#f4f3f8",
  muted: "#a09eae",
  accent: "#a78bfa",
};

/** Dark marks (Next.js, Express…) would vanish on the dark ground, so they turn light. */
function markColor(icon: SimpleIcon): string {
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map(
    (i) => parseInt(icon.hex.slice(i, i + 2), 16) / 255,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.25
    ? colors.ink
    : `#${icon.hex}`;
}

function mark(icon: SimpleIcon | undefined, label: string, size: number): Node {
  if (!icon)
    return h(
      "div",
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size / 4,
        background: colors.line,
        color: colors.ink,
        fontSize: size * 0.6,
        fontWeight: 700,
      },
      label.charAt(0).toUpperCase(),
    );
  return {
    type: "svg",
    props: {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      children: {
        type: "path",
        props: { d: icon.path, fill: markColor(icon) },
      },
    },
  };
}

/** Chips shown; the rest are counted. */
const CHIPS = 12;

export async function GET(request: Request): Promise<Response> {
  const stack = stackFromQuery(new URL(request.url).searchParams);
  const framework = stack?.framework ?? "react";
  const frameworkName = stack?.frameworkName ?? "React";
  const modules = stack?.modules ?? [];
  const command = `npm create pickstack@latest my-app -- --framework ${framework}${
    modules.length ? ` --modules ${modules.join(",")}` : ""
  }`;

  const chips = modules.slice(0, CHIPS).map((id) =>
    h(
      "div",
      {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        borderRadius: 14,
        background: colors.panel,
        border: `2px solid ${colors.line}`,
        color: colors.ink,
        fontSize: 26,
      },
      mark(moduleIcons[id], moduleName(id), 28),
      moduleName(id),
    ),
  );
  if (modules.length > CHIPS)
    chips.push(
      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          padding: "12px 6px",
          color: colors.muted,
          fontSize: 26,
        },
        `+${modules.length - CHIPS} more`,
      ),
    );

  const page = h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      // Satori sizes boxes as content-box: 1200×630 minus the padding.
      width: 1200 - 2 * 64,
      height: 630 - 2 * 56,
      padding: "56px 64px",
      background: colors.bg,
      color: colors.ink,
      fontFamily: "Geist",
    },
    h(
      "div",
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      },
      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 34,
          fontWeight: 700,
        },
        h("div", {
          display: "flex",
          width: 40,
          height: 40,
          borderRadius: 10,
          background: colors.accent,
        }),
        "pickstack",
      ),
      h(
        "div",
        { display: "flex", fontSize: 26, color: colors.muted },
        "pickstack.online",
      ),
    ),
    h(
      "div",
      { display: "flex", flexDirection: "column", gap: 28 },
      h(
        "div",
        { display: "flex", alignItems: "center", gap: 22 },
        mark(
          frameworkIcons[framework as keyof typeof frameworkIcons],
          frameworkName,
          72,
        ),
        h(
          "div",
          { display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2 },
          frameworkName,
        ),
        h(
          "div",
          {
            display: "flex",
            marginLeft: 8,
            padding: "6px 14px",
            borderRadius: 999,
            border: `2px solid ${colors.line}`,
            color: colors.muted,
            fontSize: 24,
          },
          stack?.language === "js" ? "JavaScript" : "TypeScript",
        ),
      ),
      chips.length
        ? h(
            "div",
            {
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              maxHeight: 250,
              overflow: "hidden",
            },
            ...chips,
          )
        : h(
            "div",
            { display: "flex", fontSize: 30, color: colors.muted },
            "A clean starting point, ready to run",
          ),
    ),
    h(
      "div",
      {
        display: "flex",
        // The page's inner width minus this bar's own padding (content-box).
        width: 1200 - 2 * 64 - 2 * 22,
        padding: "16px 22px",
        borderRadius: 14,
        background: colors.panel,
        color: colors.muted,
        fontSize: 22,
      },
      h("span", { color: "#34d399", marginRight: 12 }, "$"),
      // Satori doesn't clip a nowrap line, so the command is cut to what fits the bar.
      command.length > 74 ? `${command.slice(0, 73)}…` : command,
    ),
  );

  const svg = await satori(page as unknown as ReactNode, {
    width: 1200,
    height: 630,
    fonts,
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      // A link's stack never changes, so previews can keep the image.
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
