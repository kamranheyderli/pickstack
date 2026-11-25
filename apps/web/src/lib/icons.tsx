import type { FrameworkId, Language, PackageManager } from "@stackforge/core";
import {
  siAngular,
  siAstro,
  siAxios,
  siBiome,
  siBun,
  siClaude,
  siCursor,
  siChakraui,
  siCloudflare,
  siDocker,
  siI18next,
  siExpress,
  siNestjs,
  siMongodb,
  siNetlify,
  siStorybook,
  siPwa,
  siReacthookform,
  siVercel,
  siEslint,
  siEditorconfig,
  siGithubactions,
  siGithubcopilot,
  siJavascript,
  siMantine,
  siMaterialdesign,
  siMui,
  siNextdotjs,
  siNpm,
  siNuxt,
  siOpensourceinitiative,
  siPinia,
  siPnpm,
  siPreact,
  siPrimevue,
  siPrettier,
  siReact,
  siReactquery,
  siReactrouter,
  siRedux,
  siSass,
  siShadcnui,
  siSolid,
  siSvelte,
  siTailwindcss,
  siTanstack,
  siTestinglibrary,
  siTurborepo,
  siTypescript,
  siVitest,
  siVuetify,
  siVuedotjs,
  siYarn,
  type SimpleIcon,
} from "simple-icons";

export const frameworkIcons: Record<FrameworkId, SimpleIcon> = {
  react: siReact,
  vue: siVuedotjs,
  svelte: siSvelte,
  solid: siSolid,
  preact: siPreact,
  angular: siAngular,
  next: siNextdotjs,
  nuxt: siNuxt,
  sveltekit: siSvelte,
  astro: siAstro,
};

export const moduleIcons: Partial<Record<string, SimpleIcon>> = {
  tailwind: siTailwindcss,
  "shadcn-svelte": siShadcnui,
  "angular-material": siMaterialdesign,
  "shadcn-vue": siShadcnui,
  shadcn: siShadcnui,
  mui: siMui,
  "chakra-ui": siChakraui,
  mantine: siMantine,
  "claude-code": siClaude,
  cursor: siCursor,
  copilot: siGithubcopilot,
  "github-actions": siGithubactions,
  editorconfig: siEditorconfig,
  license: siOpensourceinitiative,
  pwa: siPwa,
  express: siExpress,
  nestjs: siNestjs,
  mongodb: siMongodb,
  storybook: siStorybook,
  "react-i18next": siI18next,
  "vue-i18n": siVuedotjs,
  vercel: siVercel,
  netlify: siNetlify,
  cloudflare: siCloudflare,
  docker: siDocker,
  primevue: siPrimevue,
  vuetify: siVuetify,
  sass: siSass,
  "redux-toolkit": siRedux,
  "react-router": siReactrouter,
  axios: siAxios,
  eslint: siEslint,
  prettier: siPrettier,
  biome: siBiome,
  vitest: siVitest,
  "testing-library": siTestinglibrary,
  pinia: siPinia,
  // Vue Router has no mark of its own; it ships under the Vue logo.
  "vue-router": siVuedotjs,
  // Official routers without marks of their own ship under their framework's logo.
  "solid-router": siSolid,
  "preact-iso": siPreact,
  "tanstack-router": siTanstack,
  "tanstack-query": siReactquery,
  "tanstack-form": siTanstack,
  "react-hook-form": siReacthookform,
  turborepo: siTurborepo,
};

export const languageIcons: Record<Language, SimpleIcon> = {
  ts: siTypescript,
  js: siJavascript,
};

export const packageManagerIcons: Record<PackageManager, SimpleIcon> = {
  npm: siNpm,
  pnpm: siPnpm,
  yarn: siYarn,
  bun: siBun,
};

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Brand color of an icon; near-black marks follow the text color so they stay visible in dark mode. */
export function brandColor(icon: SimpleIcon): string {
  return luminance(icon.hex) < 0.2 ? "currentColor" : `#${icon.hex}`;
}

export function BrandIcon({
  icon,
  size = 18,
}: {
  icon: SimpleIcon;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={brandColor(icon)}
    >
      <path d={icon.path} />
    </svg>
  );
}

/** Fallback for tools without a published mark: first letter in a rounded tile. */
export function LetterIcon({
  label,
  size = 18,
}: {
  label: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.6 }}
      className="inline-grid place-items-center rounded-[5px] bg-ink/10 font-bold text-ink"
    >
      {label.charAt(0)}
    </span>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export type UiIconName =
  | "sun"
  | "moon"
  | "monitor"
  | "download"
  | "check"
  | "folder"
  | "sparkles"
  | "file"
  | "chevron"
  | "pencil"
  | "undo"
  | "copy"
  | "terminal"
  | "link"
  | "lock"
  | "search";

const uiPaths: Record<UiIconName, string[]> = {
  sun: [
    "M12 4V2",
    "M12 22v-2",
    "m4.93 4.93 1.41 1.41",
    "m17.66 17.66 1.41 1.41",
    "M2 12h2",
    "M20 12h2",
    "m6.34 17.66-1.41 1.41",
    "m19.07 4.93-1.41 1.41",
    "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  ],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"],
  monitor: [
    "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    "M8 21h8",
    "M12 17v4",
  ],
  download: [
    "M12 15V3",
    "m7 10 5 5 5-5",
    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
  ],
  check: ["M20 6 9 17l-5-5"],
  copy: [
    "M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z",
    "M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2",
  ],
  terminal: ["m4 17 6-6-6-6", "M12 19h8"],
  lock: [
    "M7 11V7a5 5 0 0 1 10 0v4",
    "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z",
  ],
  search: ["m21 21-4.34-4.34", "M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"],
  link: [
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  ],
  folder: [
    "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
  ],
  sparkles: [
    "M9.94 14.06 8 20l-1.94-5.94L0 12l6.06-1.94L8 4l1.94 6.06L16 12Z",
    "M20 3v4",
    "M22 5h-4",
  ],
  file: [
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
    "M14 2v4a2 2 0 0 0 2 2h4",
  ],
  chevron: ["m9 18 6-6-6-6"],
  pencil: [
    "M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z",
    "m15 5 4 4",
  ],
  undo: ["M3 7v6h6", "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"],
};

export function UiIcon({
  name,
  size = 16,
}: {
  name: UiIconName;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      {...stroke}
    >
      {uiPaths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
