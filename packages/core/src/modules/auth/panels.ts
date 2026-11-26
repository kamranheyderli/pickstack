import { file, kebab, renderImports } from "../../engine/code";
import { demoClasses } from "../../frameworks/shared/demo";
import type { Ctx, ProjectModel } from "../../types";
import { formClasses, type FormClasses } from "../forms/shared";

/** The demo's sign-in card, under the counter. */
export const AUTH_WIDGET = "AuthPanel";

export const authCopy = {
  checking: "Checking your session…",
  offline: "The API isn't running: start it in server/.",
  name: "Name",
  email: "Email",
  password: "Password",
  signIn: "Sign in",
  signUp: "Create account",
  signOut: "Sign out",
  toSignIn: "Have an account? Sign in",
  toSignUp: "New here? Create an account",
};

export interface PanelClasses extends FormClasses {
  link: string;
}

export function panelClasses(model: ProjectModel): PanelClasses {
  return { ...formClasses(model), link: demoClasses(model).link };
}

/**
 * `auth-client` with the framework's Better Auth client (or the vanilla one). No `baseURL`: the
 * app's dev server proxies `/api/auth` to the API, so the client talks to its own origin.
 */
export function writeAuthClient(
  model: ProjectModel,
  ctx: Ctx,
  path: string,
  from: string,
): void {
  model.pkg.dependencies.add("better-auth");
  model.files.set(
    `${path}.${ctx.ext.script}`,
    file([
      `import { createAuthClient } from "${from}";`,
      "",
      "// No baseURL: the dev server proxies /api/auth to the API, so this is the app's own origin.",
      "export const authClient = createAuthClient();",
    ]),
  );
}

/** Signs up or in with the form's fields; resolves to the error to show ("" when it worked). */
const submitBody = (signingUp: string, pad: string): string[] =>
  [
    'const email = String(form.get("email"));',
    'const password = String(form.get("password"));',
    "const { error } = " + signingUp,
    "  ? await authClient.signUp.email({",
    '      name: String(form.get("name")),',
    "      email,",
    "      password,",
    "    })",
    "  : await authClient.signIn.email({ email, password });",
    "// A network failure has no message: the proxy got no answer from the API.",
    `return error ? (error.message ?? "${authCopy.offline}") : "";`,
  ].map((line) => pad + line);

/** The form's fields; `attr` is the framework's spelling of the dynamic bits. */
interface FieldSyntax {
  cls: string;
  /** Wraps the name field so it only shows while signing up. */
  ifSigningUp: (lines: string[]) => string[];
  autocomplete: string;
  minLength: string;
}

function fields(c: PanelClasses, s: FieldSyntax): string[] {
  const label = (text: string, input: string[]) => [
    `<label ${s.cls}="${c.label}">`,
    `  ${text}`,
    ...input.map((l) => "  " + l),
    "</label>",
  ];
  return [
    ...s.ifSigningUp(
      label(authCopy.name, [
        `<input name="name" required ${s.cls === "className" ? "autoComplete" : "autocomplete"}="name" ${s.cls}="${c.input}" />`,
      ]),
    ),
    ...label(authCopy.email, [
      `<input type="email" name="email" required ${s.cls === "className" ? "autoComplete" : "autocomplete"}="email" ${s.cls}="${c.input}" />`,
    ]),
    ...label(authCopy.password, [
      "<input",
      '  type="password"',
      '  name="password"',
      "  required",
      `  ${s.minLength}`,
      `  ${s.autocomplete}`,
      `  ${s.cls}="${c.input}"`,
      "/>",
    ]),
  ];
}

const pad = (lines: string[], by: string) => lines.map((l) => by + l);

function vuePanel(c: PanelClasses, ts: boolean): string {
  return file([
    `<script setup${ts ? ' lang="ts"' : ""}>`,
    ...renderImports([
      { from: "vue", named: ["ref"] },
      { from: "../lib/auth-client", named: ["authClient"] },
    ]),
    "",
    "const session = authClient.useSession();",
    `const mode = ref${ts ? '<"sign-in" | "sign-up">' : ""}("sign-in");`,
    'const error = ref("");',
    "",
    `async function signInOrUp(form${ts ? ": FormData" : ""}) {`,
    ...submitBody('mode.value === "sign-up"', "  "),
    "}",
    "",
    `async function submit(event${ts ? ": Event" : ""}) {`,
    `  error.value = await signInOrUp(new FormData(event.target${ts ? " as HTMLFormElement" : ""}));`,
    "}",
    "",
    "function toggle() {",
    '  mode.value = mode.value === "sign-up" ? "sign-in" : "sign-up";',
    '  error.value = "";',
    "}",
    "</script>",
    "",
    "<template>",
    `  <p v-if="session.isPending" class="${c.text}">${authCopy.checking}</p>`,
    `  <div v-else-if="session.data" class="${c.form}">`,
    `    <p class="${c.text}">`,
    "      Signed in as {{ session.data.user.name }} ({{ session.data.user.email }}).",
    "    </p>",
    `    <button type="button" class="${c.btn}" @click="authClient.signOut()">`,
    `      ${authCopy.signOut}`,
    "    </button>",
    "  </div>",
    `  <form v-else class="${c.form}" @submit.prevent="submit">`,
    ...pad(
      fields(c, {
        cls: "class",
        ifSigningUp: ([first = "", ...rest]) => [
          first.replace("<label", `<label v-if="mode === 'sign-up'"`),
          ...rest,
        ],
        minLength: 'minlength="8"',
        autocomplete:
          ":autocomplete=\"mode === 'sign-up' ? 'new-password' : 'current-password'\"",
      }),
      "    ",
    ),
    `    <p v-if="error" role="alert" class="${c.error}">{{ error }}</p>`,
    `    <button type="submit" class="${c.btn}">`,
    `      {{ mode === "sign-up" ? "${authCopy.signUp}" : "${authCopy.signIn}" }}`,
    "    </button>",
    `    <button type="button" class="${c.link}" @click="toggle">`,
    `      {{ mode === "sign-up" ? "${authCopy.toSignIn}" : "${authCopy.toSignUp}" }}`,
    "    </button>",
    "  </form>",
    "</template>",
  ]);
}

function sveltePanel(c: PanelClasses, ts: boolean): string {
  return file([
    `<script${ts ? ' lang="ts"' : ""}>`,
    '  import { authClient } from "./auth-client";',
    "",
    "  const session = authClient.useSession();",
    `  let mode = $state${ts ? '<"sign-in" | "sign-up">' : ""}("sign-in");`,
    '  let error = $state("");',
    "",
    `  async function signInOrUp(form${ts ? ": FormData" : ""}) {`,
    ...submitBody('mode === "sign-up"', "    "),
    "  }",
    "",
    `  async function submit(event${ts ? ": SubmitEvent" : ""}) {`,
    "    event.preventDefault();",
    `    error = await signInOrUp(new FormData(event.currentTarget${ts ? " as HTMLFormElement" : ""}));`,
    "  }",
    "",
    "  function toggle() {",
    '    mode = mode === "sign-up" ? "sign-in" : "sign-up";',
    '    error = "";',
    "  }",
    "</script>",
    "",
    "{#if $session.isPending}",
    `  <p class="${c.text}">${authCopy.checking}</p>`,
    "{:else if $session.data}",
    `  <div class="${c.form}">`,
    `    <p class="${c.text}">`,
    "      Signed in as {$session.data.user.name} ({$session.data.user.email}).",
    "    </p>",
    `    <button type="button" class="${c.btn}" onclick={() => authClient.signOut()}>`,
    `      ${authCopy.signOut}`,
    "    </button>",
    "  </div>",
    "{:else}",
    `  <form class="${c.form}" onsubmit={submit}>`,
    ...pad(
      fields(c, {
        cls: "class",
        ifSigningUp: (lines) => [
          '{#if mode === "sign-up"}',
          ...pad(lines, "  "),
          "{/if}",
        ],
        minLength: 'minlength="8"',
        autocomplete:
          'autocomplete={mode === "sign-up" ? "new-password" : "current-password"}',
      }),
      "    ",
    ),
    "    {#if error}",
    `      <p role="alert" class="${c.error}">{error}</p>`,
    "    {/if}",
    `    <button type="submit" class="${c.btn}">`,
    `      {mode === "sign-up" ? "${authCopy.signUp}" : "${authCopy.signIn}"}`,
    "    </button>",
    `    <button type="button" class="${c.link}" onclick={toggle}>`,
    `      {mode === "sign-up" ? "${authCopy.toSignIn}" : "${authCopy.toSignUp}"}`,
    "    </button>",
    "  </form>",
    "{/if}",
  ]);
}

/** The form and its two buttons, shared by the Solid and Preact panels (`class` JSX). */
function jsxForm(
  c: PanelClasses,
  signingUp: string,
  setError: string,
): string[] {
  return [
    "<form",
    `  class="${c.form}"`,
    "  onSubmit={async (event) => {",
    "    event.preventDefault();",
    `    ${setError}(await signInOrUp(new FormData(event.currentTarget)));`,
    "  }}",
    ">",
    ...pad(
      fields(c, {
        cls: "class",
        ifSigningUp: (lines) => [
          `{${signingUp} && (`,
          ...pad(lines, "  "),
          ")}",
        ],
        minLength: "minLength={8}",
        autocomplete: `autocomplete={${signingUp} ? "new-password" : "current-password"}`,
      }),
      "  ",
    ),
  ];
}

function solidPanel(c: PanelClasses, ts: boolean): string {
  return file([
    ...renderImports([
      { from: "solid-js", named: ["createSignal", "Match", "Switch"] },
      { from: "../lib/auth-client", named: ["authClient"] },
    ]),
    "",
    `async function signInOrUp(form${ts ? ": FormData" : ""}, signingUp${ts ? ": boolean" : ""}) {`,
    ...submitBody("signingUp", "  "),
    "}",
    "",
    `export default function ${AUTH_WIDGET}() {`,
    "  const session = authClient.useSession();",
    "  const [signingUp, setSigningUp] = createSignal(false);",
    '  const [error, setError] = createSignal("");',
    "",
    "  return (",
    "    <Switch",
    "      fallback={",
    ...pad(
      [
        ...jsxForm(c, "signingUp()", "setError").map((l) =>
          l.replace(
            "signInOrUp(new FormData(event.currentTarget))",
            "signInOrUp(new FormData(event.currentTarget), signingUp())",
          ),
        ),
        "  {error() && (",
        `    <p role="alert" class="${c.error}">`,
        "      {error()}",
        "    </p>",
        "  )}",
        `  <button type="submit" class="${c.btn}">`,
        `    {signingUp() ? "${authCopy.signUp}" : "${authCopy.signIn}"}`,
        "  </button>",
        "  <button",
        '    type="button"',
        `    class="${c.link}"`,
        "    onClick={() => {",
        "      setSigningUp(!signingUp());",
        '      setError("");',
        "    }}",
        "  >",
        `    {signingUp() ? "${authCopy.toSignIn}" : "${authCopy.toSignUp}"}`,
        "  </button>",
        "</form>",
      ],
      "        ",
    ),
    "      }",
    "    >",
    "      <Match when={session().isPending}>",
    `        <p class="${c.text}">${authCopy.checking}</p>`,
    "      </Match>",
    "      <Match when={session().data}>",
    "        {(data) => (",
    `          <div class="${c.form}">`,
    `            <p class="${c.text}">`,
    "              Signed in as {data().user.name} ({data().user.email}).",
    "            </p>",
    `            <button type="button" class="${c.btn}" onClick={() => authClient.signOut()}>`,
    `              ${authCopy.signOut}`,
    "            </button>",
    "          </div>",
    "        )}",
    "      </Match>",
    "    </Switch>",
    "  );",
    "}",
  ]);
}

function preactPanel(c: PanelClasses, ts: boolean): string {
  return file([
    ...renderImports([
      { from: "preact/hooks", named: ["useEffect", "useState"] },
      { from: "../lib/auth-client", named: ["authClient"] },
    ]),
    "",
    `async function signInOrUp(form${ts ? ": FormData" : ""}, signingUp${ts ? ": boolean" : ""}) {`,
    ...submitBody("signingUp", "  "),
    "}",
    "",
    `export default function ${AUTH_WIDGET}() {`,
    "  // The vanilla client's session is a nanostores atom: read it, then follow its changes.",
    "  const [session, setSession] = useState(authClient.useSession.get());",
    "  useEffect(() => authClient.useSession.subscribe((value) => setSession(value)), []);",
    "  const [signingUp, setSigningUp] = useState(false);",
    '  const [error, setError] = useState("");',
    "",
    `  if (session.isPending) return <p class="${c.text}">${authCopy.checking}</p>;`,
    "",
    "  if (session.data) {",
    "    return (",
    `      <div class="${c.form}">`,
    `        <p class="${c.text}">`,
    "          Signed in as {session.data.user.name} ({session.data.user.email}).",
    "        </p>",
    `        <button type="button" class="${c.btn}" onClick={() => authClient.signOut()}>`,
    `          ${authCopy.signOut}`,
    "        </button>",
    "      </div>",
    "    );",
    "  }",
    "",
    "  return (",
    ...pad(
      [
        ...jsxForm(c, "signingUp", "setError").map((l) =>
          l.replace(
            "signInOrUp(new FormData(event.currentTarget))",
            "signInOrUp(new FormData(event.currentTarget), signingUp)",
          ),
        ),
        "  {error && (",
        `    <p role="alert" class="${c.error}">`,
        "      {error}",
        "    </p>",
        "  )}",
        `  <button type="submit" class="${c.btn}">`,
        `    {signingUp ? "${authCopy.signUp}" : "${authCopy.signIn}"}`,
        "  </button>",
        "  <button",
        '    type="button"',
        `    class="${c.link}"`,
        "    onClick={() => {",
        "      setSigningUp(!signingUp);",
        '      setError("");',
        "    }}",
        "  >",
        `    {signingUp ? "${authCopy.toSignIn}" : "${authCopy.toSignUp}"}`,
        "  </button>",
        "</form>",
      ],
      "    ",
    ),
    "  );",
    "}",
  ]);
}

function angularPanel(c: PanelClasses): string {
  const selector = `app-${kebab(AUTH_WIDGET)}`;
  const template = [
    "@if (session().isPending) {",
    `  <p class="${c.text}">${authCopy.checking}</p>`,
    "} @else {",
    "  @if (session().data; as data) {",
    `    <div class="${c.form}">`,
    `      <p class="${c.text}">Signed in as {{ data.user.name }} ({{ data.user.email }}).</p>`,
    `      <button type="button" class="${c.btn}" (click)="signOut()">${authCopy.signOut}</button>`,
    "    </div>",
    "  } @else {",
    `    <form class="${c.form}" (submit)="submit($event)">`,
    ...pad(
      fields(c, {
        cls: "class",
        ifSigningUp: (lines) => [
          "@if (signingUp()) {",
          ...pad(lines, "  "),
          "}",
        ],
        minLength: 'minlength="8"',
        autocomplete:
          "[autocomplete]=\"signingUp() ? 'new-password' : 'current-password'\"",
      }),
      "      ",
    ),
    "      @if (error()) {",
    `        <p role="alert" class="${c.error}">{{ error() }}</p>`,
    "      }",
    `      <button type="submit" class="${c.btn}">`,
    `        {{ signingUp() ? "${authCopy.signUp}" : "${authCopy.signIn}" }}`,
    "      </button>",
    `      <button type="button" class="${c.link}" (click)="toggle()">`,
    `        {{ signingUp() ? "${authCopy.toSignIn}" : "${authCopy.toSignUp}" }}`,
    "      </button>",
    "    </form>",
    "  }",
    "}",
  ];
  return file([
    ...renderImports([
      {
        from: "@angular/core",
        named: ["Component", "DestroyRef", "inject", "signal"],
      },
      { from: "../../lib/auth-client", named: ["authClient"] },
    ]),
    "",
    "@Component({",
    `  selector: "${selector}",`,
    "  template: `",
    ...pad(template, "    "),
    "  `,",
    "})",
    `export class ${AUTH_WIDGET} {`,
    "  // The vanilla client's session is a nanostores atom: read it, then follow its changes.",
    "  protected readonly session = signal(authClient.useSession.get());",
    "  protected readonly signingUp = signal(false);",
    '  protected readonly error = signal("");',
    "",
    "  constructor() {",
    "    const stop = authClient.useSession.subscribe((value) => this.session.set(value));",
    "    inject(DestroyRef).onDestroy(stop);",
    "  }",
    "",
    "  protected async submit(event: SubmitEvent): Promise<void> {",
    "    event.preventDefault();",
    "    const form = new FormData(event.target as HTMLFormElement);",
    "    this.error.set(await this.signInOrUp(form));",
    "  }",
    "",
    "  protected toggle(): void {",
    "    this.signingUp.update((value) => !value);",
    '    this.error.set("");',
    "  }",
    "",
    "  protected signOut(): void {",
    "    void authClient.signOut();",
    "  }",
    "",
    "  private async signInOrUp(form: FormData): Promise<string> {",
    ...submitBody("this.signingUp()", "    "),
    "  }",
    "}",
  ]);
}

/** The client and the panel for every SPA but React (see `react.ts`). */
export function authPanel(model: ProjectModel, ctx: Ctx): void {
  const c = panelClasses(model);
  const ts = ctx.isTs;
  const x = ctx.ext.component;
  switch (ctx.selection.framework) {
    case "vue":
      writeAuthClient(model, ctx, "src/lib/auth-client", "better-auth/vue");
      model.files.set(`src/components/${AUTH_WIDGET}.vue`, vuePanel(c, ts));
      break;
    case "svelte":
      writeAuthClient(model, ctx, "src/lib/auth-client", "better-auth/svelte");
      model.files.set(`src/lib/${AUTH_WIDGET}.svelte`, sveltePanel(c, ts));
      break;
    case "solid":
      writeAuthClient(model, ctx, "src/lib/auth-client", "better-auth/solid");
      model.files.set(`src/components/${AUTH_WIDGET}.${x}`, solidPanel(c, ts));
      break;
    case "preact":
      writeAuthClient(model, ctx, "src/lib/auth-client", "better-auth/client");
      model.files.set(`src/components/${AUTH_WIDGET}.${x}`, preactPanel(c, ts));
      break;
    case "angular": {
      writeAuthClient(
        model,
        ctx,
        "src/app/lib/auth-client",
        "better-auth/client",
      );
      const name = kebab(AUTH_WIDGET);
      model.files.set(`src/app/components/${name}/${name}.ts`, angularPanel(c));
      break;
    }
    default:
      return;
  }
  model.demo.widgets.push(AUTH_WIDGET);
}
