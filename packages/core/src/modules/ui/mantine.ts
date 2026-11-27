import type { Module } from "../../types";

const BREAKPOINTS = {
  "mantine-breakpoint-xs": "36em",
  "mantine-breakpoint-sm": "48em",
  "mantine-breakpoint-md": "62em",
  "mantine-breakpoint-lg": "75em",
  "mantine-breakpoint-xl": "88em",
};

/**
 * Mantine (v9), following its Vite and Next.js guides: `MantineProvider`, the core styles and
 * `postcss-preset-mantine`. On Next the `<html>` element gets `mantineHtmlProps` and the head a
 * `ColorSchemeScript`. With Tailwind, Mantine's layered styles go in a `mantine` layer before
 * Tailwind's utilities.
 */
export const mantine: Module = {
  id: "mantine",
  name: "Mantine",
  category: "ui",
  description: {
    az: "100+ komponent və hook (v9).",
    en: "100+ components and hooks (v9).",
    ru: "100+ компонентов и хуков (v9).",
  },
  frameworks: ["react", "next"],
  apply(model, ctx) {
    const next = ctx.selection.framework === "next";
    const tailwind = model.styles.mode === "tailwind";
    model.pkg.dependencies.add("@mantine/core").add("@mantine/hooks");
    model.pkg.devDependencies
      .add("postcss")
      .add("postcss-preset-mantine")
      .add("postcss-simple-vars");
    model.bundler.postcss["postcss-preset-mantine"] = {};
    model.bundler.postcss["postcss-simple-vars"] = { variables: BREAKPOINTS };

    if (tailwind) {
      // Tailwind's own `@import "tailwindcss";` follows these.
      model.styles.globalImports.unshift(
        "@layer theme, base, mantine, components, utilities;",
        '@import "@mantine/core/styles.layer.css";',
      );
    }
    model.entry.providers.push({
      id: "mantine",
      open: "<MantineProvider>",
      close: "</MantineProvider>",
      imports: [
        {
          from: "@mantine/core",
          named: [
            "MantineProvider",
            ...(next ? ["ColorSchemeScript", "mantineHtmlProps"] : []),
          ],
        },
        ...(tailwind ? [] : [{ from: "@mantine/core/styles.css" }]),
      ],
      order: 5,
    });
    if (next) {
      model.entry.htmlAttrs.push("{...mantineHtmlProps}");
      model.entry.head.push("<ColorSchemeScript />");
    }

    model.demo.view = {
      imports: [
        {
          from: "@mantine/core",
          named: ["Button", "Card", "Group", "Text", "Title"],
        },
      ],
      markup: (c) => [
        '<Card withBorder shadow="sm" radius="md" padding="xl" miw={240} ta="center">',
        '  <Title order={2} size="h4">',
        "    Counter",
        "  </Title>",
        '  <Text fz={48} fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>',
        `    {${c.value}}`,
        "  </Text>",
        '  <Group justify="center" mt="md">',
        `    <Button variant="default" onClick={${c.decrement}}>`,
        "      -1",
        "    </Button>",
        `    <Button onClick={${c.increment}}>+1</Button>`,
        "  </Group>",
        "</Card>",
      ],
      testHarness: {
        imports: [{ from: "@mantine/core", named: ["MantineProvider"] }],
        wrapper: { open: "<MantineProvider>", close: "</MantineProvider>" },
      },
    };
    model.readme.stack.push("Mantine");
  },
};
