import { file, renderImports } from "../../engine/code";
import type { Module } from "../../types";
import { FORM_WIDGET, copy, formClasses, schemaLines } from "./shared";

/**
 * React Hook Form with the Zod resolver: a `SignupForm` under the counter with one validated
 * email field and a success state. The schema's output type types the form values.
 */
export const reactHookForm: Module = {
  id: "react-hook-form",
  name: "React Hook Form",
  category: "forms",
  description: {
    az: "Performanslı React formları, Zod validasiyası ilə.",
    en: "Performant React forms with Zod validation.",
  },
  frameworks: ["react"],
  conflicts: ["tanstack-form"],
  apply(model, ctx) {
    model.pkg.dependencies
      .add("react-hook-form")
      .add("@hookform/resolvers")
      .add("zod");
    const c = formClasses(model);
    const ts = ctx.isTs;
    model.files.set(
      `src/components/${FORM_WIDGET}.${ctx.ext.component}`,
      file([
        ...renderImports([
          { from: "@hookform/resolvers/zod", named: ["zodResolver"] },
          { from: "react", named: ["useState"] },
          { from: "react-hook-form", named: ["useForm"] },
          { from: "zod", named: ["z"] },
        ]),
        "",
        ...schemaLines,
        "",
        `export default function ${FORM_WIDGET}() {`,
        '  const [joined, setJoined] = useState("");',
        "  const {",
        "    register,",
        "    handleSubmit,",
        "    formState: { errors },",
        `  } = useForm${ts ? "<z.infer<typeof schema>>" : ""}({`,
        "    resolver: zodResolver(schema),",
        '    defaultValues: { email: "" },',
        "  });",
        "",
        `  if (joined) return <p className="${c.text}">${copy.thanks("{joined}")}</p>;`,
        "",
        "  return (",
        "    <form",
        "      noValidate",
        `      className="${c.form}"`,
        "      onSubmit={handleSubmit((values) => setJoined(values.email))}",
        "    >",
        `      <label className="${c.label}">`,
        `        ${copy.label}`,
        `        <input type="email" className="${c.input}" {...register("email")} />`,
        "        {errors.email && (",
        `          <span role="alert" className="${c.error}">`,
        "            {errors.email.message}",
        "          </span>",
        "        )}",
        "      </label>",
        `      <button type="submit" className="${c.btn}">`,
        `        ${copy.submit}`,
        "      </button>",
        "    </form>",
        "  );",
        "}",
      ]),
    );
    model.demo.widgets.push(FORM_WIDGET);
    model.readme.stack.push("React Hook Form", "Zod");
  },
};
