// After `vite build`: copy the live demo and what it fetches into dist at the
// same paths they have in the repo, so /demo/ works on the deployed site.
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(web, "..");
const dist = join(web, "dist");

// docs/store and docs/images sit beside the built docs/index.html page.
for (const path of [
  "demo",
  "test/fixtures",
  "popup.html",
  "popup.js",
  "unsubscriber.js",
  "content.js",
  "icons",
  "docs/images",
  "docs/store",
]) {
  mkdirSync(dirname(join(dist, path)), { recursive: true });
  cpSync(join(repo, path), join(dist, path), { recursive: true });
}
