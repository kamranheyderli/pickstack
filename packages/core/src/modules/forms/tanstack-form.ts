import { file, kebab, renderImports } from "../../engine/code";
import type { Ctx, FrameworkId, Module } from "../../types";
import {
  FORM_WIDGET,
  copy,
  formClasses,
  type FormClasses,
  type Validator,
  validator,
} from "./shared";

const packages: Partial<Record<FrameworkId, string>> = {
  react: "@tanstack/react-form",
  solid: "@tanstack/solid-form",
  vue: "@tanstack/vue-form",
  svelte: "@tanstack/svelte-form",
  angular: "@tanstack/angular-form",
};

/** Form options shared by every adapter: the schema validates on submit, then the field on change. */
const formOptions = (onSubmit: string, v: Validator) => [
  'defaultValues: { email: "" },',
  `validators: { ${v.async ? "onSubmitAsync" : "onSubmit"}: schema },`,
  `onSubmit: ({ value }) => ${onSubmit},`,
];

const thanksJsx = (email: string) => copy.thanks(`{${email}}`);

function reactFile(
  ctx: Ctx,
  pkg: string,
  c: FormClasses,
  v: Validator,
): string {
  return file([
    ...renderImports([
      { from: pkg, named: ["useForm"] },
      { from: "react", named: ["useState"] },
      v.imports,
    ]),
    "",
    ...v.schema,
    "",
    `export default function ${FORM_WIDGET}() {`,
    '  const [joined, setJoined] = useState("");',
    "  const form = useForm({",
    ...formOptions("setJoined(value.email)", v).map((l) => `    ${l}`),
    "  });",
    "",
    `  if (joined) return <p className="${c.text}">${thanksJsx("joined")}</p>;`,
    "",
    "  return (",
    "    <form",
    "      noValidate",
    `      className="${c.form}"`,
    "      onSubmit={(event) => {",
    "        event.preventDefault();",
    "        void form.handleSubmit();",
    "      }}",
    "    >",
    '      <form.Field name="email">',
    "        {(field) => (",
    `          <label className="${c.label}">`,
    `            ${copy.label}`,
    "            <input",
    '              type="email"',
    `              className="${c.input}"`,
    "              name={field.name}",
    "              value={field.state.value}",
    "              onBlur={field.handleBlur}",
    "              onChange={(event) => field.handleChange(event.target.value)}",
    "            />",
    "            {field.state.meta.errors[0] && (",
    `              <span role="alert" className="${c.error}">`,
    "                {field.state.meta.errors[0].message}",
    "              </span>",
    "            )}",
    "          </label>",
    "        )}",
    "      </form.Field>",
    `      <button type="submit" className="${c.btn}">`,
    `        ${copy.submit}`,
    "      </button>",
    "    </form>",
    "  );",
    "}",
  ]);
}

function solidFile(
  ctx: Ctx,
  pkg: string,
  c: FormClasses,
  v: Validator,
): string {
  return file([
    ...renderImports([
      { from: pkg, named: ["createForm"] },
      { from: "solid-js", named: ["Show", "createSignal"] },
      v.imports,
    ]),
    "",
    ...v.schema,
    "",
    `export default function ${FORM_WIDGET}() {`,
    '  const [joined, setJoined] = createSignal("");',
    "  const form = createForm(() => ({",
    ...formOptions("setJoined(value.email)", v).map((l) => `    ${l}`),
    "  }));",
    "",
    "  return (",
    "    <Show",
    "      when={!joined()}",
    `      fallback={<p class="${c.text}">${thanksJsx("joined()")}</p>}`,
    "    >",
    "      <form",
    "        noValidate",
    `        class="${c.form}"`,
    "        onSubmit={(event) => {",
    "          event.preventDefault();",
    "          void form.handleSubmit();",
    "        }}",
    "      >",
    '        <form.Field name="email">',
    "          {(field) => (",
    `            <label class="${c.label}">`,
    `              ${copy.label}`,
    "              <input",
    '                type="email"',
    `                class="${c.input}"`,
    "                name={field().name}",
    "                value={field().state.value}",
    "                onBlur={field().handleBlur}",
    "                onInput={(event) => field().handleChange(event.currentTarget.value)}",
    "              />",
    "              <Show when={field().state.meta.errors[0]}>",
    "                {(error) => (",
    `                  <span role="alert" class="${c.error}">`,
    "                    {error().message}",
    "                  </span>",
    "                )}",
    "              </Show>",
    "            </label>",
    "          )}",
    "        </form.Field>",
    `        <button type="submit" class="${c.btn}">`,
    `          ${copy.submit}`,
    "        </button>",
    "      </form>",
    "    </Show>",
    "  );",
    "}",
  ]);
}

function vueFile(ctx: Ctx, pkg: string, c: FormClasses, v: Validator): string {
  const target = ctx.isTs
    ? "(event.target as HTMLInputElement).value"
    : "event.target.value";
  return file([
    `<script setup${ctx.isTs ? ' lang="ts"' : ""}>`,
    ...renderImports([
      { from: pkg, named: ["useForm"] },
      { from: "vue", named: ["ref"] },
      v.imports,
    ]),
    "",
    ...v.schema,
    "",
    'const joined = ref("");',
    "const form = useForm({",
    ...formOptions("(joined.value = value.email)", v).map((l) => `  ${l}`),
    "});",
    "</script>",
    "",
    "<template>",
    `  <p v-if="joined" class="${c.text}">${copy.thanks("{{ joined }}")}</p>`,
    `  <form v-else novalidate class="${c.form}" @submit.prevent="form.handleSubmit()">`,
    '    <form.Field name="email">',
    '      <template #default="{ field }">',
    `        <label class="${c.label}">`,
    `          ${copy.label}`,
    "          <input",
    '            type="email"',
    `            class="${c.input}"`,
    '            :name="field.name"',
    '            :value="field.state.value"',
    '            @blur="field.handleBlur"',
    `            @input="(event) => field.handleChange(${target})"`,
    "          />",
    "          <span",
    '            v-if="field.state.meta.errors[0]"',
    '            role="alert"',
    `            class="${c.error}"`,
    "          >",
    "            {{ field.state.meta.errors[0].message }}",
    "          </span>",
    "        </label>",
    "      </template>",
    "    </form.Field>",
    `    <button type="submit" class="${c.btn}">${copy.submit}</button>`,
    "  </form>",
    "</template>",
  ]);
}

function svelteFile(
  ctx: Ctx,
  pkg: string,
  c: FormClasses,
  v: Validator,
): string {
  return file([
    `<script${ctx.isTs ? ' lang="ts"' : ""}>`,
    ...renderImports([{ from: pkg, named: ["createForm"] }, v.imports]).map(
      (l) => `  ${l}`,
    ),
    "",
    ...v.schema.map((l) => `  ${l}`),
    "",
    '  let joined = $state("");',
    "  const form = createForm(() => ({",
    ...formOptions("(joined = value.email)", v).map((l) => `    ${l}`),
    "  }));",
    "</script>",
    "",
    "{#if joined}",
    `  <p class="${c.text}">${copy.thanks("{joined}")}</p>`,
    "{:else}",
    "  <form",
    "    novalidate",
    `    class="${c.form}"`,
    "    onsubmit={(event) => {",
    "      event.preventDefault();",
    "      form.handleSubmit();",
    "    }}",
    "  >",
    '    <form.Field name="email">',
    "      {#snippet children(field)}",
    `        <label class="${c.label}">`,
    `          ${copy.label}`,
    "          <input",
    '            type="email"',
    `            class="${c.input}"`,
    "            name={field.name}",
    "            value={field.state.value}",
    "            onblur={field.handleBlur}",
    "            oninput={(event) => field.handleChange(event.currentTarget.value)}",
    "          />",
    "          {#if field.state.meta.errors[0]}",
    `            <span role="alert" class="${c.error}">`,
    "              {field.state.meta.errors[0].message}",
    "            </span>",
    "          {/if}",
    "        </label>",
    "      {/snippet}",
    "    </form.Field>",
    `    <button type="submit" class="${c.btn}">${copy.submit}</button>`,
    "  </form>",
    "{/if}",
  ]);
}

function angularFiles(
  pkg: string,
  c: FormClasses,
  v: Validator,
): [string, string][] {
  const name = kebab(FORM_WIDGET);
  const dir = `src/app/components/${name}`;
  return [
    [
      `${dir}/${name}.ts`,
      file([
        ...renderImports([
          { from: "@angular/core", named: ["Component", "signal"] },
          { from: pkg, named: ["TanStackField", "injectForm", "injectStore"] },
          v.imports,
        ]),
        "",
        ...v.schema,
        "",
        "@Component({",
        `  selector: "app-${name}",`,
        "  imports: [TanStackField],",
        `  templateUrl: "./${name}.html",`,
        "})",
        `export class ${FORM_WIDGET} {`,
        '  protected readonly joined = signal("");',
        "  protected readonly form = injectForm({",
        ...formOptions("this.joined.set(value.email)", v).map(
          (l) => `    ${l}`,
        ),
        "  });",
        "  // The template reads errors through a signal, so it updates without zone.js.",
        "  protected readonly errors = injectStore(",
        "    this.form,",
        "    (state) => state.fieldMeta.email?.errors ?? [],",
        "  );",
        "",
        "  protected submit(event: SubmitEvent): void {",
        "    event.preventDefault();",
        "    void this.form.handleSubmit();",
        "  }",
        "}",
      ]),
    ],
    [
      `${dir}/${name}.html`,
      file([
        "@if (joined()) {",
        `  <p class="${c.text}">${copy.thanks("{{ joined() }}")}</p>`,
        "} @else {",
        `  <form novalidate class="${c.form}" (submit)="submit($event)">`,
        '    <ng-container [tanstackField]="form" name="email" #email="field">',
        `      <label class="${c.label}">`,
        `        ${copy.label}`,
        "        <input",
        '          type="email"',
        `          class="${c.input}"`,
        '          [name]="email.api.name"',
        '          [value]="email.api.state.value"',
        '          (blur)="email.api.handleBlur()"',
        '          (input)="email.api.handleChange($any($event.target).value)"',
        "        />",
        "        @if (errors()[0]; as error) {",
        `          <span role="alert" class="${c.error}">{{ error.message }}</span>`,
        "        }",
        "      </label>",
        "    </ng-container>",
        `    <button type="submit" class="${c.btn}">${copy.submit}</button>`,
        "  </form>",
        "}",
      ]),
    ],
  ];
}

/**
 * TanStack Form with a Zod or Yup schema (both implement Standard Schema, so no adapter): a
 * `SignupForm` under the counter with one validated email field and a success state.
 */
export const tanstackForm: Module = {
  id: "tanstack-form",
  name: "TanStack Form",
  category: "forms",
  description: {
    az: "Tip-təhlükəsiz formlar, Zod və ya Yup validasiyası ilə.",
    en: "Type-safe forms with Zod or Yup validation.",
    ru: "Типобезопасные формы с валидацией Zod или Yup.",
  },
  frameworks: ["react", "solid", "vue", "svelte", "angular"],
  conflicts: ["react-hook-form"],
  apply(model, ctx) {
    const framework = ctx.selection.framework;
    const pkg = packages[framework];
    if (!pkg) throw new Error(`no TanStack Form package for ${framework}`);
    const v = validator(ctx);
    model.pkg.dependencies.add(pkg).add(v.pkg);
    const c = formClasses(model);
    const x = ctx.ext.component;
    const files: [string, string][] =
      framework === "react"
        ? [[`src/components/${FORM_WIDGET}.${x}`, reactFile(ctx, pkg, c, v)]]
        : framework === "solid"
          ? [[`src/components/${FORM_WIDGET}.${x}`, solidFile(ctx, pkg, c, v)]]
          : framework === "vue"
            ? [[`src/components/${FORM_WIDGET}.vue`, vueFile(ctx, pkg, c, v)]]
            : framework === "svelte"
              ? [[`src/lib/${FORM_WIDGET}.svelte`, svelteFile(ctx, pkg, c, v)]]
              : angularFiles(pkg, c, v);
    for (const [path, content] of files) model.files.set(path, content);
    model.demo.widgets.push(FORM_WIDGET);
    model.readme.stack.push("TanStack Form", v.name);
  },
};
