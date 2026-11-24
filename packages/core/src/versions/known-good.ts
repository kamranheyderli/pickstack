import type { FrameworkId } from "../types";

/**
 * Version sets that were installed and built together (see `pnpm smoke`).
 * This is the only place package versions may appear.
 *
 * TypeScript stays on 6.0: typescript-eslint 8.x peers on `typescript <6.1`.
 */
type VersionSet = Readonly<Record<string, string>>;

const shared: VersionSet = {
  typescript: "~6.0.3",
  tailwindcss: "^4.3.5",
  "@tailwindcss/vite": "^4.3.5",
  axios: "^1.21.1",
  prettier: "^3.10.1",
};

const frameworks: Partial<Record<FrameworkId, VersionSet>> = {
  react: {
    react: "^19.3.1",
    "react-dom": "^19.3.1",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    vite: "^8.3.8",
    "@vitejs/plugin-react": "^6.3.0",
    "@reduxjs/toolkit": "^2.15.0",
    "react-redux": "^9.3.1",
    zustand: "^5.1.0",
    "react-router": "^8.5.2",
  },
};

export class UnknownVersionError extends Error {
  constructor(pkg: string, framework: FrameworkId) {
    super(
      `No known-good version for "${pkg}" (framework: ${framework}). Add it to versions/known-good.ts.`,
    );
    this.name = "UnknownVersionError";
  }
}

export function knownGoodVersion(pkg: string, framework: FrameworkId): string {
  const version = frameworks[framework]?.[pkg] ?? shared[pkg];
  if (!version) throw new UnknownVersionError(pkg, framework);
  return version;
}
