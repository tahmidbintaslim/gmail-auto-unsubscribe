// Builds the Chrome Web Store upload: dist/unsubsweep-<version>.zip with
// only the files the extension ships, manifest.json at the archive root.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function shippedFiles(manifest) {
  const files = ["manifest.json", "popup.html", "popup.js", "unsubscriber.js", "content.js", ...Object.values(manifest.icons)];
  return [...new Set(files)].sort();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const out = join(root, "dist", `unsubsweep-${manifest.version}.zip`);
  mkdirSync(dirname(out), { recursive: true });
  rmSync(out, { force: true });
  // -X drops extra file attributes so the zip is the same on every machine.
  execFileSync("zip", ["-X", "-q", out, ...shippedFiles(manifest)], { cwd: root, stdio: "inherit" });
  console.log(out);
}
