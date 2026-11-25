import type { Module } from "../../types";

/** `ng add @angular/material` (v22): a Material 3 theme with `mat.theme()`, Roboto and icons. */
const THEME = `// Include theming for Angular Material with \`mat.theme()\`.
// This Sass mixin will define CSS variables that are used for styling Angular Material
// components according to the Material 3 design spec.
// Learn more about theming and how to use it for your application's
// custom components at https://material.angular.dev/guide/theming
@use "@angular/material" as mat;

html {
  height: 100%;
  @include mat.theme(
    (
      color: (
        primary: mat.$azure-palette,
        tertiary: mat.$blue-palette,
      ),
      typography: Roboto,
      density: 0,
    )
  );
}

body {
  // Default the application to a light color theme. This can be changed to
  // \`dark\` to enable the dark color theme, or to \`light dark\` to defer to the
  // user's system settings.
  color-scheme: light;

  // Set a default background, font and text colors for the application using
  // Angular Material's system-level CSS variables. Learn more about these
  // variables at https://material.angular.dev/guide/system-variables
  background-color: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
  font: var(--mat-sys-body-medium);

  // Reset the user agent margin.
  margin: 0;
  height: 100%;
}
`;

const FONTS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet" />',
  '<link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet" />',
];

const CARD_PARTS = [
  "MatCard",
  "MatCardActions",
  "MatCardContent",
  "MatCardHeader",
  "MatCardTitle",
];

/**
 * Angular Material, as `ng add @angular/material` sets it up: the theme is its own
 * `material-theme.scss` listed before the global stylesheet (no conversion to SCSS needed;
 * Angular's builder ships Sass), plus the font links. No animations provider: Angular 22
 * Material does not need `@angular/animations`.
 */
export const angularMaterial: Module = {
  id: "angular-material",
  name: "Angular Material",
  category: "ui",
  description: {
    az: "Material Design 3 komponentləri (Angular komandasından).",
    en: "Material Design 3 components from the Angular team.",
  },
  frameworks: ["angular"],
  apply(model) {
    model.pkg.dependencies.add("@angular/material").add("@angular/cdk");
    model.files.set("src/material-theme.scss", THEME);
    model.styles.preload.push("src/material-theme.scss");
    model.entry.head.push(...FONTS);

    const tailwind = model.styles.mode === "tailwind";
    if (!tailwind) {
      model.styles.globalCss.push(
        [
          ".counter {",
          "  min-width: 16rem;",
          "  text-align: center;",
          "}",
          "",
          ".actions {",
          "  justify-content: center;",
          "  gap: 0.75rem;",
          "}",
        ].join("\n"),
      );
    }
    const cls = tailwind
      ? {
          card: "min-w-64 text-center",
          count: "text-5xl font-bold tabular-nums",
          actions: "justify-center gap-3",
        }
      : { card: "counter", count: "count", actions: "actions" };

    model.demo.view = {
      imports: [
        { from: "@angular/material/button", named: ["MatButton"] },
        { from: "@angular/material/card", named: CARD_PARTS },
      ],
      components: ["MatButton", ...CARD_PARTS],
      markup: (c) => [
        `<mat-card appearance="outlined" class="${cls.card}">`,
        "  <mat-card-header>",
        "    <mat-card-title>Counter</mat-card-title>",
        "  </mat-card-header>",
        "  <mat-card-content>",
        `    <p class="${cls.count}">{{ ${c.value} }}</p>`,
        "  </mat-card-content>",
        `  <mat-card-actions class="${cls.actions}">`,
        `    <button matButton="outlined" type="button" (click)="${c.decrement}">-1</button>`,
        `    <button matButton="filled" type="button" (click)="${c.increment}">+1</button>`,
        "  </mat-card-actions>",
        "</mat-card>",
      ],
    };
    model.readme.stack.push("Angular Material");
  },
};
