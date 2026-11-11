// Smoke test of the built site: `npm run build && npm run smoke`.
// Serves dist/ with the same rewrites as vercel.json and checks every route in
// Chromium: no console or page errors, no horizontal scroll at 360px, with and
// without reduced motion, and that the demo still runs to "Swept".
// `--serve` only serves (http://localhost:4173) for a manual look.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif", ".woff2": "font/woff2", ".json": "application/json",
};

const server = createServer((req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path === "/privacy" || path === "/privacy/") path = "/privacy.html";
  let file = join(dist, path);
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end("not found");
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});

const serveOnly = process.argv.includes("--serve");
await new Promise((ok) => server.listen(serveOnly ? 4173 : 0, ok));
const base = `http://localhost:${server.address().port}`;
if (serveOnly) {
  console.log(base);
} else {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const failures = [];
  const routes = ["/", "/features/", "/try/", "/docs/", "/privacy", "/demo/"];
  try {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      for (const width of [360, 1280]) {
        const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion });
        for (const route of routes) {
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (e) => errors.push(String(e)));
          page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
          page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
          await page.goto(base + route, { waitUntil: "networkidle" });
          await page.waitForTimeout(600);
          const tag = `${route} @${width} ${reducedMotion}`;
          if (errors.length) failures.push(`${tag}: ${errors.join(" | ")}`);
          // The bare demo is a two-pane desktop tool; only the site's own pages must fit a phone.
          if (route !== "/demo/") {
            const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            if (over > 0) failures.push(`${tag}: horizontal scroll (${over}px)`);
          }
          if ((await page.locator("h1").count()) !== 1) failures.push(`${tag}: expected exactly one h1`);
          await page.close();
        }
        await context.close();
      }
    }
    // The demo must still run the real extension files to the end.
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(base + "/demo/");
    const popup = page.frameLocator("#popup");
    await popup.locator("#startBtn").click();
    await popup.locator("#status").filter({ hasText: "Swept: 4 unsubscribed, 1 skipped." }).waitFor({ timeout: 30000 })
      .catch(() => failures.push("/demo/: run did not reach 'Swept: 4 unsubscribed, 1 skipped.'"));
  } finally {
    await browser.close();
    server.close();
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`smoke ok: ${routes.length} routes x 2 widths x 2 motion settings, demo ran to Swept`);
}
