import { demoClasses } from "../../frameworks/shared/demo";
import type { Ctx, ImportSpec, ProjectModel } from "../../types";

/** The demo form: one validated email field under the counter. */
export const FORM_WIDGET = "SignupForm";

export const copy = {
  label: "Email",
  submit: "Sign up",
  invalid: "Enter a valid email address.",
  thanks: (email: string) => `Thanks, ${email} is on the list.`,
};

/**
 * The schema library the demo form validates with. Zod 4 and Yup 1.7+ both implement Standard
 * Schema, so TanStack Form takes either schema as is; React Hook Form uses the matching resolver
 * from `@hookform/resolvers`.
 */
export interface Validator {
  id: "zod" | "yup";
  name: string;
  /** The package and what the form imports from it. */
  pkg: string;
  imports: ImportSpec;
  /** `const schema = ...`, validating the email field. */
  schema: string[];
  /** The values' TypeScript type, from the schema. */
  infer: string;
  /** Type-only import `infer` needs, if any. */
  inferImport: ImportSpec | null;
  resolver: { from: string; name: string };
  /**
   * Its Standard Schema `validate` returns a promise (Yup's does), so TanStack Form needs the
   * async validator slot: the sync one throws "async function passed to sync validator".
   */
  async: boolean;
}

const zodValidator: Validator = {
  id: "zod",
  name: "Zod",
  pkg: "zod",
  imports: { from: "zod", named: ["z"] },
  schema: [
    "const schema = z.object({",
    `  email: z.email("${copy.invalid}"),`,
    "});",
  ],
  infer: "z.infer<typeof schema>",
  inferImport: null,
  resolver: { from: "@hookform/resolvers/zod", name: "zodResolver" },
  async: false,
};

const yupValidator: Validator = {
  id: "yup",
  name: "Yup",
  pkg: "yup",
  imports: { from: "yup", named: ["object", "string"] },
  schema: [
    "const schema = object({",
    `  email: string().required("${copy.invalid}").email("${copy.invalid}"),`,
    "});",
  ],
  infer: "InferType<typeof schema>",
  inferImport: { from: "yup", types: ["InferType"] },
  resolver: { from: "@hookform/resolvers/yup", name: "yupResolver" },
  async: true,
};

/** Yup when the `yup` module is picked; Zod otherwise (also when `zod` is picked explicitly). */
export function validator(ctx: Ctx): Validator {
  return ctx.has("yup") ? yupValidator : zodValidator;
}

export interface FormClasses {
  form: string;
  label: string;
  input: string;
  error: string;
  text: string;
  btn: string;
}

/** Plain CSS for the form's classes when there's no utility framework. */
const plainFormCss = `.form {
  display: flex;
  width: 100%;
  max-width: 24rem;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.input {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font: inherit;
}

.error {
  color: #dc2626;
  font-weight: 400;
}`;

/** Class names for the form; adds their CSS to the global stylesheet without Tailwind. */
export function formClasses(model: ProjectModel): FormClasses {
  const demo = demoClasses(model);
  if (model.styles.mode === "tailwind") {
    return {
      form: "flex w-full max-w-sm flex-col gap-3",
      label: "flex flex-col gap-1 text-sm font-medium",
      input:
        "rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal",
      error: "font-normal text-red-600",
      text: demo.text,
      btn: demo.btn,
    };
  }
  if (!model.styles.globalCss.includes(plainFormCss))
    model.styles.globalCss.push(plainFormCss);
  return {
    form: "form",
    label: "field",
    input: "input",
    error: "error",
    text: demo.text,
    btn: demo.btn,
  };
}
