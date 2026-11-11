import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = (p: string) => resolve(import.meta.dirname, p);
const partial = (name: string) => readFileSync(here(`src/partials/${name}.html`), "utf8");

export default defineConfig({
  // demo/, the v1 files and fixtures are copied in after the build (scripts/copy-static.mjs).
  publicDir: "public",
  plugins: [
    {
      // One header and one footer for every page, inlined at build time so pages work without JS.
      name: "unsubsweep-partials",
      transformIndexHtml: (html) =>
        html.replace("<!--header-->", partial("header")).replace("<!--footer-->", partial("footer")),
    },
  ],
  build: {
    rollupOptions: {
      input: {
        index: here("index.html"),
        features: here("features/index.html"),
        try: here("try/index.html"),
        docs: here("docs/index.html"),
        privacy: here("privacy.html"),
      },
    },
  },
});
