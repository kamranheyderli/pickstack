import { demoClasses } from "../../frameworks/shared/demo";
import type { ProjectModel } from "../../types";

/** The demo form: one validated email field under the counter. */
export const FORM_WIDGET = "SignupForm";

export const copy = {
  label: "Email",
  submit: "Sign up",
  invalid: "Enter a valid email address.",
  thanks: (email: string) => `Thanks, ${email} is on the list.`,
};

/** The Zod schema every form library validates against (Zod 4 is a Standard Schema). */
export const schemaLines = [
  "const schema = z.object({",
  `  email: z.email("${copy.invalid}"),`,
  "});",
];

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
