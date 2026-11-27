import { file } from "../../engine/code";
import type { Module } from "../../types";

/**
 * Material UI (v9) with Emotion, following MUI's installation and Next.js App Router guides:
 * a `createTheme` with CSS variables, `ThemeProvider` + `CssBaseline`, and on Next the
 * `AppRouterCacheProvider` that collects Emotion styles during server rendering. With Tailwind,
 * MUI's styles go into a `mui` cascade layer before Tailwind's utilities (MUI's Tailwind v4
 * guide), so utility classes can override components.
 */
export const mui: Module = {
  id: "mui",
  name: "Material UI",
  category: "ui",
  description: {
    az: "Google-un Material Design komponentləri (MUI v9).",
    en: "Google's Material Design components (MUI v9).",
    ru: "Компоненты Material Design от Google (MUI v9).",
  },
  frameworks: ["react", "next"],
  apply(model, ctx) {
    const next = ctx.selection.framework === "next";
    const tailwind = model.styles.mode === "tailwind";
    model.pkg.dependencies
      .add("@mui/material")
      .add("@emotion/react")
      .add("@emotion/styled");

    model.files.set(
      `${next ? "" : "src/"}theme.${ctx.ext.script}`,
      file([
        // The theme is passed from the server layout into a client provider.
        ...(next ? ['"use client";', ""] : []),
        'import { createTheme } from "@mui/material/styles";',
        "",
        "const theme = createTheme({",
        "  cssVariables: true,",
        "});",
        "",
        "export default theme;",
      ]),
    );

    if (next) {
      model.pkg.dependencies.add("@mui/material-nextjs").add("@emotion/cache");
      model.entry.providers.push({
        id: "mui-cache",
        open: tailwind
          ? "<AppRouterCacheProvider options={{ enableCssLayer: true }}>"
          : "<AppRouterCacheProvider>",
        close: "</AppRouterCacheProvider>",
        imports: [
          {
            from: "@mui/material-nextjs/v16-appRouter",
            named: ["AppRouterCacheProvider"],
          },
        ],
        order: 4,
      });
    } else if (tailwind) {
      model.entry.providers.push({
        id: "mui-layer",
        open: '<StyledEngineProvider enableCssLayer>\n<GlobalStyles styles="@layer theme, base, mui, components, utilities;" />',
        close: "</StyledEngineProvider>",
        imports: [
          { from: "@mui/material/styles", named: ["StyledEngineProvider"] },
          { from: "@mui/material/GlobalStyles", default: "GlobalStyles" },
        ],
        order: 4,
      });
    }
    if (next && tailwind) {
      model.styles.globalImports.unshift(
        "@layer theme, base, mui, components, utilities;",
      );
    }
    model.entry.providers.push({
      id: "mui-theme",
      open: "<ThemeProvider theme={theme}>\n<CssBaseline />",
      close: "</ThemeProvider>",
      imports: [
        { from: "@mui/material/styles", named: ["ThemeProvider"] },
        { from: "@mui/material/CssBaseline", default: "CssBaseline" },
        { from: next ? "@/theme" : "./theme", default: "theme" },
      ],
      order: 5,
    });

    model.demo.view = {
      imports: [
        { from: "@mui/material/Button", default: "Button" },
        { from: "@mui/material/Card", default: "Card" },
        { from: "@mui/material/CardActions", default: "CardActions" },
        { from: "@mui/material/CardContent", default: "CardContent" },
        { from: "@mui/material/Typography", default: "Typography" },
      ],
      markup: (c) => [
        '<Card variant="outlined" sx={{ minWidth: 240, textAlign: "center" }}>',
        "  <CardContent>",
        '    <Typography variant="h6" component="h2">',
        "      Counter",
        "    </Typography>",
        "    <Typography",
        '      variant="h3"',
        '      component="p"',
        '      sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}',
        "    >",
        `      {${c.value}}`,
        "    </Typography>",
        "  </CardContent>",
        '  <CardActions sx={{ justifyContent: "center", pb: 2 }}>',
        `    <Button variant="outlined" onClick={${c.decrement}}>`,
        "      -1",
        "    </Button>",
        `    <Button variant="contained" onClick={${c.increment}}>`,
        "      +1",
        "    </Button>",
        "  </CardActions>",
        "</Card>",
      ],
    };
    model.readme.stack.push("Material UI");
  },
};
