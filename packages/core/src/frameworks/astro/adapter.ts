import { file, json, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type { Ctx, FrameworkAdapter, ProjectModel } from "../../types";
import {
  aboutText,
  demoClasses,
  globalCss,
  type DemoClasses,
} from "../shared/demo";
import { el, printMarkup } from "../shared/markup";

/**
 * Astro 7, following the `minimal` template. No UI framework is added: the counter is a
 * custom element with a bundled `<script>`, the idiomatic zero-framework island in Astro.
 */
export const astroAdapter: FrameworkAdapter = {
  id: "astro",
  name: "Astro",
  kind: "meta",
  languages: ["js", "ts"],
  srcDir: "src",
  // Only `PUBLIC_`-prefixed variables reach client code in Astro.
  publicEnv: (name) => ({
    key: `PUBLIC_${name}`,
    read: `import.meta.env.PUBLIC_${name}`,
  }),
  ignore: [".astro"],
  // .astro needs prettier-plugin-astro, which has no browser build; files are printed pre-formatted.
  formatParsers: { ".astro": null },
  componentExt: () => "astro",

  base(ctx) {
    const model = createModel();
    const { pkg } = model;
    pkg.dependencies.add("astro");
    pkg.scripts["dev"] = "astro dev";
    pkg.scripts["build"] = "astro build";
    pkg.scripts["preview"] = "astro preview";
    pkg.scripts["astro"] = "astro";
    if (ctx.isTs) {
      pkg.devDependencies.add("@astrojs/check").add("typescript");
      pkg.scripts["typecheck"] = "astro check";
    }
    // Astro always keeps a tsconfig: it drives editor tooling and generated types.
    model.files.set(
      "tsconfig.json",
      json({
        extends: ctx.isTs ? "astro/tsconfigs/strict" : "astro/tsconfigs/base",
        include: [".astro/types.d.ts", "**/*"],
        exclude: ["dist"],
      }),
    );
    model.readme.stack.push("Astro", ...(ctx.isTs ? ["TypeScript"] : []));
    return model;
  },

  render(model, ctx) {
    const cls = demoClasses(model);
    model.files.set("astro.config.mjs", astroConfig(model));
    model.files.set("src/styles/global.css", globalCss(model));
    model.files.set("src/layouts/Layout.astro", layout(model, ctx, cls));
    model.files.set("src/components/Counter.astro", counter(cls));
    model.files.set(
      "src/pages/index.astro",
      astroFile(
        [
          'import Counter from "../components/Counter.astro";',
          'import Layout from "../layouts/Layout.astro";',
        ],
        printMarkup(
          el(
            "Layout",
            ['title="Home"'],
            [
              el(
                "section",
                [`class="${cls.page}"`],
                [
                  el("h1", [`class="${cls.title}"`], ctx.selection.name),
                  "<Counter />",
                ],
              ),
            ],
          ),
        ),
      ),
    );
    model.files.set(
      "src/pages/about.astro",
      astroFile(
        ['import Layout from "../layouts/Layout.astro";'],
        printMarkup(
          el(
            "Layout",
            ['title="About"'],
            [
              el(
                "section",
                [`class="${cls.page}"`],
                [
                  el("h1", [`class="${cls.title}"`], "About"),
                  el("p", [`class="${cls.text}"`], aboutText(model)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  },
};

function astroFile(
  frontmatter: string[],
  markup: string[],
  script: string[] = [],
): string {
  return file([
    ...(frontmatter.length ? ["---", ...frontmatter, "---", ""] : []),
    ...markup,
    ...(script.length
      ? ["", "<script>", ...script.map((l) => (l ? `  ${l}` : l)), "</script>"]
      : []),
  ]);
}

function astroConfig(model: ProjectModel): string {
  const { plugins, integrations } = model.bundler;
  const body = [
    // `site` is required by @astrojs/sitemap and used for canonical URLs.
    ...(model.seo
      ? [`  site: process.env.SITE_URL ?? "${model.seo.siteUrl}",`]
      : []),
    ...(integrations.length
      ? [`  integrations: [${integrations.map((i) => i.call).join(", ")}],`]
      : []),
    ...(plugins.length
      ? [
          "  vite: {",
          `    plugins: [${plugins.map((p) => p.call).join(", ")}],`,
          "  },",
        ]
      : []),
  ];
  return file([
    "// @ts-check",
    ...renderImports([
      { from: "astro/config", named: ["defineConfig"] },
      ...integrations.map((i) => i.import),
      ...plugins.map((p) => p.import),
    ]),
    "",
    "// https://astro.build/config",
    ...(body.length
      ? ["export default defineConfig({", ...body, "});"]
      : ["export default defineConfig({});"]),
  ]);
}

function layout(model: ProjectModel, ctx: Ctx, cls: DemoClasses): string {
  const seo = model.seo;
  return astroFile(
    [
      'import "../styles/global.css";',
      "",
      ...(ctx.isTs ? ["interface Props {", "  title: string;", "}", ""] : []),
      "const { title } = Astro.props;",
      ...(seo
        ? [
            "const canonical = new URL(Astro.url.pathname, Astro.site);",
            "const jsonLd = JSON.stringify({",
            '  "@context": "https://schema.org",',
            '  "@type": "WebSite",',
            `  name: "${ctx.selection.name}",`,
            "  url: Astro.site?.href,",
            "});",
          ]
        : []),
    ],
    printMarkup(
      el(
        "html",
        ['lang="en"'],
        [
          el(
            "head",
            [],
            [
              '<meta charset="utf-8" />',
              '<meta name="viewport" content="width=device-width" />',
              '<meta name="generator" content={Astro.generator} />',
              "<title>{title}</title>",
              ...(seo
                ? [
                    `<meta name="description" content="${seo.description}" />`,
                    '<link rel="canonical" href={canonical} />',
                    '<link rel="sitemap" href="/sitemap-index.xml" />',
                    '<meta property="og:type" content="website" />',
                    '<meta property="og:title" content={title} />',
                    '<meta property="og:url" content={canonical} />',
                    '<meta name="twitter:card" content="summary" />',
                    '<script type="application/ld+json" set:html={jsonLd} />',
                  ]
                : []),
            ],
          ),
          el(
            "body",
            [],
            [
              el(
                "main",
                [`class="${cls.main}"`],
                [
                  el(
                    "nav",
                    [`class="${cls.nav}"`],
                    [
                      el("a", [`class="${cls.link}"`, 'href="/"'], "Home"),
                      el(
                        "a",
                        [`class="${cls.link}"`, 'href="/about"'],
                        "About",
                      ),
                    ],
                  ),
                  "<slot />",
                ],
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

function counter(cls: DemoClasses): string {
  return astroFile(
    [],
    printMarkup(
      el(
        "counter-card",
        [],
        [
          el(
            "div",
            [`class="${cls.card}"`],
            [
              el("p", [`class="${cls.count}"`, "data-count"], "0"),
              el(
                "div",
                [`class="${cls.row}"`],
                [
                  el(
                    "button",
                    ['type="button"', `class="${cls.btn}"`, 'data-step="-1"'],
                    "-1",
                  ),
                  el(
                    "button",
                    ['type="button"', `class="${cls.btn}"`, 'data-step="1"'],
                    "+1",
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ),
    [
      "class CounterCard extends HTMLElement {",
      "  connectedCallback() {",
      '    const output = this.querySelector("[data-count]");',
      "    let count = 0;",
      '    for (const button of this.querySelectorAll("button")) {',
      '      button.addEventListener("click", () => {',
      "        count += Number(button.dataset.step);",
      "        if (output) output.textContent = String(count);",
      "      });",
      "    }",
      "  }",
      "}",
      "",
      'customElements.define("counter-card", CounterCard);',
    ],
  );
}
