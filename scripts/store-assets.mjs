// Rebuilds the store images in docs/store from the live demo and brand/logo.svg.
// Run after changing the popup or the logo: `npm run store-assets`.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (name) => join(root, "docs/store", name);
const { chromium } = createRequire(import.meta.url)("playwright");
const port = 8765;
const server = spawn(process.execPath, [join(root, "scripts/serve-demo.mjs")], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });

const browser = await chromium.launch();
try {
  await new Promise((r) => setTimeout(r, 800));
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${port}/demo/`, { waitUntil: "networkidle" });
  // The developer note under the title is for people reading the demo, not store shoppers.
  await page.addStyleTag({ content: "header p { display: none; }" });
  const popup = page.frameLocator("#popup");
  await page.screenshot({ path: out("screenshot-1-ready.png") });
  await popup.locator("#startBtn").click();
  // Gmail's confirm dialog is up while a sender is being unsubscribed.
  await page.frameLocator("#gmail").getByText(/^Unsubscribe from .*\?$/).first().waitFor();
  await page.screenshot({ path: out("screenshot-2-running.png") });
  await popup.locator("#status").filter({ hasText: /^Swept:/ }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: out("screenshot-3-swept.png") });

  const tile = await browser.newPage({ viewport: { width: 440, height: 280 } });
  const logo = readFileSync(join(root, "brand/logo.svg"), "utf8").replace(/width="\d+" height="128"/, 'width="300" height="69"');
  const font = `file://${join(root, "fonts/figtree.woff2")}`;
  await tile.setContent(`<style>@font-face{font-family:F;src:url("${font}")}body{margin:0;height:280px;display:grid;place-content:center;justify-items:center;gap:22px;background:#FFF4EE;font:500 19px F,sans-serif;color:#5E4A55;text-align:center}b{color:#C2360F}</style>${logo}<div>Bulk unsubscribe in Gmail.<br><b>Never reads your email.</b></div>`);
  await tile.evaluate(() => document.fonts.ready);
  await tile.screenshot({ path: out("promo-small-440x280.png") });
} finally {
  await browser.close();
  server.kill();
}
