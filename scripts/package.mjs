// Builds the store uploads with only the files the extension ships, manifest.json at the archive root:
//   dist/unsubsweep-<version>.zip          Chrome Web Store, Edge Add-ons, Opera
//   dist/unsubsweep-<version>-firefox.zip  Firefox (same files, manifest with the Firefox settings)
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function shippedFiles(manifest) {
  const files = ["manifest.json", "popup.html", "popup.js", "unsubscriber.js", "content.js", "fonts/figtree.woff2", "fonts/LICENSE-figtree", ...Object.values(manifest.icons)];
  return [...new Set(files)].sort();
}

// Firefox needs an add-on id and, for new listings, a data collection statement.
export function firefoxManifest(manifest) {
  return {
    ...manifest,
    browser_specific_settings: {
      gecko: {
        id: "unsubsweep@unsubsweep.vercel.app",
        strict_min_version: "109.0",
        data_collection_permissions: { required: ["none"] },
      },
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const out = join(root, "dist", `unsubsweep-${manifest.version}.zip`);
  mkdirSync(dirname(out), { recursive: true });
  rmSync(out, { force: true });
  // -X leaves out extra file attributes (owner ids, extended timestamps).
  execFileSync("zip", ["-X", "-q", out, ...shippedFiles(manifest)], { cwd: root, stdio: "inherit" });
  console.log(out);

  const files = shippedFiles(manifest);
  const stage = mkdtempSync(join(tmpdir(), "unsubsweep-firefox-"));
  for (const file of files) cpSync(join(root, file), join(stage, file), { recursive: true });
  writeFileSync(join(stage, "manifest.json"), JSON.stringify(firefoxManifest(manifest), null, 2) + "\n");
  const firefox = out.replace(/\.zip$/, "-firefox.zip");
  rmSync(firefox, { force: true });
  execFileSync("zip", ["-X", "-q", firefox, ...files], { cwd: stage, stdio: "inherit" });
  rmSync(stage, { recursive: true });
  console.log(firefox);
}
