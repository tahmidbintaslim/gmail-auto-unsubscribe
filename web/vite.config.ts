import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = (p: string) => resolve(import.meta.dirname, p);
const partial = (name: string) => readFileSync(here(`src/partials/${name}.html`), "utf8");

const SITE = "https://unsubsweep.vercel.app";

// Canonical URL and share tags for every page, built from its own title and description.
function seo(html: string, path: string): string {
  const url = SITE + path.replace(/index\.html$/, "").replace(/\.html$/, "");
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
  const description = html.match(/<meta name="description" content="(.*?)">/)?.[1] ?? "";
  const tags = [
    `<link rel="canonical" href="${url}">`,
    `<meta name="theme-color" content="#F2542D">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="UnsubSweep">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:image" content="${SITE}/og.jpg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ];
  return html.replace("</head>", `  ${tags.join("\n  ")}\n</head>`);
}

export default defineConfig({
  // demo/, the v1 files and fixtures are copied in after the build (scripts/copy-static.mjs).
  publicDir: "public",
  plugins: [
    {
      // One header and one footer for every page, inlined at build time so pages work without JS.
      name: "unsubsweep-partials",
      transformIndexHtml: (html, ctx) =>
        seo(html, ctx.path).replace("<!--header-->", partial("header")).replace("<!--footer-->", partial("footer")),
    },
  ],
  build: {
    rollupOptions: {
      input: {
        index: here("index.html"),
        try: here("try/index.html"),
        docs: here("docs/index.html"),
        privacy: here("privacy.html"),
      },
    },
  },
});
