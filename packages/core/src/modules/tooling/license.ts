import { file } from "../../engine/code";
import type { Module } from "../../types";

/** The MIT License, with the project's authors as copyright holders. */
export const license: Module = {
  id: "license",
  name: "MIT License",
  category: "tooling",
  description: {
    az: "MIT lisenziyası faylı və package.json-da `license`.",
    en: "MIT license file and `license` in package.json.",
  },
  frameworks: "all",
  apply(model, ctx) {
    const year = ctx.selection.year ?? new Date().getFullYear();
    model.pkg.fields["license"] = "MIT";
    model.repoFiles.set(
      "LICENSE",
      file([
        "MIT License",
        "",
        `Copyright (c) ${year} ${ctx.selection.name} authors`,
        "",
        "Permission is hereby granted, free of charge, to any person obtaining a copy",
        'of this software and associated documentation files (the "Software"), to deal',
        "in the Software without restriction, including without limitation the rights",
        "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
        "copies of the Software, and to permit persons to whom the Software is",
        "furnished to do so, subject to the following conditions:",
        "",
        "The above copyright notice and this permission notice shall be included in all",
        "copies or substantial portions of the Software.",
        "",
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
        "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
        "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
        "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
        "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
        "SOFTWARE.",
      ]),
    );
    model.readme.sections.push({
      title: "License",
      body: "MIT, see `LICENSE`.",
    });
  },
};
