import type { Module } from "../../types";

/**
 * The schema library for the demo form. The form modules read the pick (`validator` in
 * `shared.ts`), so these only claim the choice; without either, forms use Zod.
 */
const formLibraries = ["tanstack-form", "react-hook-form"];
const formFrameworks: Module["frameworks"] = [
  "react",
  "solid",
  "vue",
  "svelte",
  "angular",
];

export const zod: Module = {
  id: "zod",
  name: "Zod",
  category: "validation",
  description: {
    az: "TypeScript-ə uyğun sxem validasiyası; formların defolt seçimi.",
    en: "TypeScript-first schema validation; the forms' default.",
    ru: "Валидация схем с упором на TypeScript; используется формами по умолчанию.",
  },
  frameworks: formFrameworks,
  requiresOneOf: formLibraries,
  apply() {},
};

export const yup: Module = {
  id: "yup",
  name: "Yup",
  category: "validation",
  description: {
    az: "Zəncirvari API ilə sxem validasiyası (Standard Schema dəstəkli Yup 1.7+).",
    en: "Schema validation with a chainable API (Yup 1.7+, a Standard Schema).",
    ru: "Валидация схем с цепочным API (Yup 1.7+, Standard Schema).",
  },
  frameworks: formFrameworks,
  requiresOneOf: formLibraries,
  apply() {},
};
