import type { Module } from "../../types";
import { components } from "./templates/chakra";

/**
 * Chakra UI v3 with the provider and color-mode snippets `@chakra-ui/cli snippet add provider`
 * writes (next-themes drives the color mode). On Next the `<html>` element gets
 * `suppressHydrationWarning`, as Chakra's App Router guide requires for next-themes.
 */
export const chakraUi: Module = {
  id: "chakra-ui",
  name: "Chakra UI",
  category: "ui",
  description: {
    az: "Prop-larla stillənən, əlçatan komponentlər (v3).",
    en: "Accessible components styled with props (v3).",
  },
  frameworks: ["react", "next"],
  apply(model, ctx) {
    const next = ctx.selection.framework === "next";
    const dir = next ? "components/ui" : "src/components/ui";
    model.pkg.dependencies
      .add("@chakra-ui/react")
      .add("@emotion/react")
      .add("next-themes")
      .add("react-icons");
    for (const [name, source] of Object.entries(components)) {
      model.files.set(
        `${dir}/${name}.${ctx.ext.component}`,
        ctx.isTs ? source.ts : source.js,
      );
    }
    // react-redux also exports `Provider`; the entry then imports Chakra's under another name.
    const name =
      !next && ctx.has("redux-toolkit") ? "ChakraUiProvider" : "Provider";
    model.entry.providers.push({
      id: "chakra",
      open: `<${name}>`,
      close: `</${name}>`,
      imports: [
        {
          from: next ? "@/components/ui/provider" : "./components/ui/provider",
          named: [name === "Provider" ? name : `Provider as ${name}`],
        },
      ],
      order: 5,
    });
    if (next) model.entry.htmlAttrs.push("suppressHydrationWarning");
    if (model.styles.mode === "tailwind") {
      model.warnings.push(
        "Chakra UI and Tailwind CSS are two styling systems with their own resets; Chakra's docs do not cover using them together.",
      );
    }

    model.demo.view = {
      imports: [
        {
          from: "@chakra-ui/react",
          named: ["Button", "Card", "HStack", "Text"],
        },
      ],
      markup: (c) => [
        '<Card.Root minW="60" textAlign="center">',
        "  <Card.Header>",
        "    <Card.Title>Counter</Card.Title>",
        "  </Card.Header>",
        "  <Card.Body>",
        '    <Text textStyle="5xl" fontWeight="bold" fontVariantNumeric="tabular-nums">',
        `      {${c.value}}`,
        "    </Text>",
        "  </Card.Body>",
        '  <Card.Footer justifyContent="center">',
        '    <HStack gap="3">',
        `      <Button variant="outline" onClick={${c.decrement}}>`,
        "        -1",
        "      </Button>",
        `      <Button onClick={${c.increment}}>+1</Button>`,
        "    </HStack>",
        "  </Card.Footer>",
        "</Card.Root>",
      ],
      // Tests render with Chakra's provider directly: next-themes needs matchMedia.
      testHarness: {
        imports: [
          {
            from: "@chakra-ui/react",
            named: ["ChakraProvider", "defaultSystem"],
          },
        ],
        wrapper: {
          open: "<ChakraProvider value={defaultSystem}>",
          close: "</ChakraProvider>",
        },
      },
    };
    model.readme.stack.push("Chakra UI");
  },
};
