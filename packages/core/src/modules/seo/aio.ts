import type { Module } from "../../types";

/**
 * AI/LLM visibility: llms.txt (llmstxt.org) and robots.txt rules that keep AI search and
 * answer crawlers allowed while opting out of training crawlers (plus Content-Signal).
 */
export const aio: Module = {
  id: "aio",
  name: "AI visibility (AIO)",
  category: "seo",
  description: {
    az: "llms.txt və AI crawler qaydaları: AI axtarışına icazə, model təliminə qadağa.",
    en: "llms.txt and AI crawler rules: allow AI search, opt out of training.",
  },
  frameworks: "all",
  requires: ["seo"],
  order: 20,
  apply(model) {
    if (!model.seo) throw new Error("aio requires the seo module to run first");
    model.seo.ai = true;
    model.readme.stack.push("llms.txt");
  },
};
