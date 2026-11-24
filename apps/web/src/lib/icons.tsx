import type { FrameworkId, Language, PackageManager } from "@stackforge/core";
import {
  siAngular,
  siAstro,
  siAxios,
  siBun,
  siJavascript,
  siNextdotjs,
  siNpm,
  siNuxt,
  siPnpm,
  siPreact,
  siPrettier,
  siReact,
  siReactrouter,
  siRedux,
  siSolid,
  siSvelte,
  siTailwindcss,
  siTypescript,
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
  "redux-toolkit": siRedux,
  "react-router": siReactrouter,
  axios: siAxios,
  prettier: siPrettier,
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

type UiIconName =
  | "sun"
  | "moon"
  | "monitor"
  | "download"
  | "check"
  | "folder"
  | "sparkles"
  | "file";

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
