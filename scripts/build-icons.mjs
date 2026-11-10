// Renders brand/mark.svg to the PNG icon sizes the manifest declares.
// Uses the pre-installed Playwright Chromium: `npm run icons`.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(import.meta.url)("playwright");
const svg = readFileSync(join(root, "brand/mark.svg"), "utf8");

const browser = await chromium.launch();
try {
  for (const size of [16, 48, 128]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: join(root, `icons/icon${size}.png`), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
