import { file, kebab, renderImports } from "../../engine/code";
import { demoClasses } from "../../frameworks/shared/demo";
import type { Ctx, ProjectModel } from "../../types";

/** The demo's call to the API, under the counter. */
export const API_WIDGET = "ApiGreeting";

const LOADING = "Calling the API…";
const OFFLINE = "The API isn't running: start it in server/.";

/** Fetches `/api/hello` (proxied to the backend in development) and returns its message. */
const request = (name: string) => [
  `fetch("/api/hello?name=${name}")`,
  "  .then((response) => {",
  "    if (!response.ok) throw new Error(`HTTP ${response.status}`);",
  "    return response.json();",
  "  })",
];

const indentAll = (lines: string[], pad: string) => lines.map((l) => pad + l);

/** The widget component(s) for the app's framework, as [path, content] pairs. */
export function apiWidget(model: ProjectModel, ctx: Ctx): [string, string][] {
  const text = demoClasses(model).text;
  const { framework, name } = ctx.selection;
  const x = ctx.ext.component;

  switch (framework) {
    case "react":
    case "preact":
      return [
        [
          `src/components/${API_WIDGET}.${x}`,
          file([
            ...renderImports([
              {
                from: framework === "react" ? "react" : "preact/hooks",
                named: ["useEffect", "useState"],
              },
            ]),
            "",
            `export default function ${API_WIDGET}() {`,
            `  const [message, setMessage] = useState("${LOADING}");`,
            "",
            "  useEffect(() => {",
            ...indentAll(request(name), "    "),
            "      .then((data) => setMessage(data.message))",
            `      .catch(() => setMessage("${OFFLINE}"));`,
            "  }, []);",
            "",
            `  return <p ${framework === "react" ? "className" : "class"}="${text}">{message}</p>;`,
            "}",
          ]),
        ],
      ];
    case "solid":
      return [
        [
          `src/components/${API_WIDGET}.${x}`,
          file([
            ...renderImports([
              { from: "solid-js", named: ["createSignal", "onMount"] },
            ]),
            "",
            `export default function ${API_WIDGET}() {`,
            `  const [message, setMessage] = createSignal("${LOADING}");`,
            "",
            "  onMount(() => {",
            ...indentAll(request(name), "    "),
            "      .then((data) => setMessage(data.message))",
            `      .catch(() => setMessage("${OFFLINE}"));`,
            "  });",
            "",
            `  return <p class="${text}">{message()}</p>;`,
            "}",
          ]),
        ],
      ];
    case "vue":
      return [
        [
          `src/components/${API_WIDGET}.vue`,
          file([
            `<script setup${ctx.isTs ? ' lang="ts"' : ""}>`,
            ...renderImports([{ from: "vue", named: ["onMounted", "ref"] }]),
            "",
            `const message = ref("${LOADING}");`,
            "",
            "onMounted(() => {",
            ...indentAll(request(name), "  "),
            "    .then((data) => (message.value = data.message))",
            `    .catch(() => (message.value = "${OFFLINE}"));`,
            "});",
            "</script>",
            "",
            "<template>",
            `  <p class="${text}">{{ message }}</p>`,
            "</template>",
          ]),
        ],
      ];
    case "svelte":
      return [
        [
          `src/lib/${API_WIDGET}.svelte`,
          file([
            `<script${ctx.isTs ? ' lang="ts"' : ""}>`,
            ...indentAll(
              renderImports([{ from: "svelte", named: ["onMount"] }]),
              "  ",
            ),
            "",
            `  let message = $state("${LOADING}");`,
            "",
            "  onMount(() => {",
            ...indentAll(request(name), "    "),
            "      .then((data) => (message = data.message))",
            `      .catch(() => (message = "${OFFLINE}"));`,
            "  });",
            "</script>",
            "",
            `<p class="${text}">{message}</p>`,
          ]),
        ],
      ];
    case "angular": {
      const file_ = kebab(API_WIDGET);
      const dir = `src/app/components/${file_}`;
      return [
        [
          `${dir}/${file_}.ts`,
          file([
            ...renderImports([
              { from: "@angular/core", named: ["Component", "signal"] },
            ]),
            "",
            "@Component({",
            `  selector: "app-${file_}",`,
            `  template: \`<p class="${text}">{{ message() }}</p>\`,`,
            "})",
            `export class ${API_WIDGET} {`,
            `  protected readonly message = signal("${LOADING}");`,
            "",
            "  constructor() {",
            ...indentAll(request(name), "    "),
            "      .then((data) => this.message.set(data.message))",
            `      .catch(() => this.message.set("${OFFLINE}"));`,
            "  }",
            "}",
          ]),
        ],
      ];
    }
    default:
      return [];
  }
}
