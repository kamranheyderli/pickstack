import { file, jsLiteral } from "../../engine/code";
import type { Ctx, Module } from "../../types";

const THEME = "#4f46e5";
const ICON = "pwa-icon.svg";

/**
 * One scalable icon for the manifest and the tab. Chrome accepts an SVG with `sizes: "any"` as
 * the install icon (checked with its installability audit); PNGs for iOS and older tools can be
 * generated from it, see the README section.
 */
function icon(ctx: Ctx): string {
  const letter = ctx.selection.name.charAt(0).toUpperCase() || "A";
  return file([
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    `  <title>${ctx.selection.name}</title>`,
    `  <rect width="512" height="512" fill="${THEME}" />`,
    "  <text",
    '    x="256"',
    '    y="256"',
    '    fill="#ffffff"',
    '    font-family="system-ui, sans-serif"',
    '    font-size="280"',
    '    font-weight="700"',
    '    text-anchor="middle"',
    '    dominant-baseline="central"',
    "  >",
    `    ${letter}`,
    "  </text>",
    "</svg>",
  ]);
}

const manifestIcons = (["any", "maskable"] as const).map((purpose) => ({
  src: ICON,
  sizes: "any",
  type: "image/svg+xml",
  purpose,
}));

/**
 * Installable, offline-capable app via vite-plugin-pwa: it writes the web manifest and a
 * Workbox service worker that precaches the build, and injects the registration script into
 * index.html, so no app code changes.
 */
export const pwa: Module = {
  id: "pwa",
  name: "PWA",
  category: "tooling",
  description: {
    az: "Quraşdırıla bilən tətbiq: manifest, ikon və oflayn keş.",
    en: "Installable app: manifest, icon and offline cache.",
    ru: "Устанавливаемое приложение: манифест, иконка и офлайн-кэш.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact"],
  conflicts: ["module-federation"],
  apply(model, ctx) {
    const { name } = ctx.selection;
    model.pkg.devDependencies.add("vite-plugin-pwa");
    const options = {
      registerType: "autoUpdate",
      includeAssets: [ICON],
      manifest: {
        name,
        short_name: name,
        description: name,
        theme_color: THEME,
        background_color: "#ffffff",
        icons: manifestIcons,
      },
    };
    model.bundler.plugins.push({
      import: { from: "vite-plugin-pwa", named: ["VitePWA"] },
      call: `VitePWA(${jsLiteral(options)})`,
    });
    model.files.set(`public/${ICON}`, icon(ctx));
    model.entry.head.push(
      `<meta name="theme-color" content="${THEME}" />`,
      `<link rel="icon" type="image/svg+xml" href="/${ICON}" />`,
    );
    model.readme.stack.push("PWA");
    model.readme.sections.push({
      title: "Progressive Web App",
      body: [
        "The production build is installable and works offline: `vite-plugin-pwa` writes the web manifest and a service worker that precaches the build, and updates it on the next visit after a deploy.",
        "",
        `The icon is \`public/${ICON}\`. To also ship PNG icons (iOS home screen, older tools), generate them from it:`,
        "",
        "```sh",
        `npx @vite-pwa/assets-generator --preset minimal-2023 public/${ICON}`,
        "```",
      ].join("\n"),
    });
  },
};
