import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const SHIPPED = ["manifest.json", "popup.html", "popup.js", "unsubscriber.js", "content.js"];

describe("manifest.json", () => {
  it("asks only for activeTab and scripting", () => {
    expect(manifest.manifest_version).toBe(3);
    expect([...manifest.permissions].sort()).toEqual(["activeTab", "scripting"]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.background).toBeUndefined();
  });

  it("points at files that exist", () => {
    expect(existsSync(join(root, manifest.action.default_popup))).toBe(true);
  });

  it("popup.html loads the loop before popup.js", () => {
    const html = read("popup.html");
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
    expect(scripts).toEqual(["unsubscriber.js", "popup.js"]);
  });
});

// The README's privacy section promises that nothing leaves the browser.
// These files are everything the extension ships.
describe("privacy", () => {
  it.each(SHIPPED)("%s has no network, storage or remote-code calls", (file) => {
    const source = read(file);
    for (const pattern of [
      /\bfetch\s*\(/,
      /XMLHttpRequest/,
      /WebSocket/,
      /EventSource/,
      /sendBeacon/,
      /chrome\.storage/,
      /localStorage|sessionStorage|indexedDB/,
      /\beval\s*\(|new Function/,
      /https?:\/\//,
    ]) {
      expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
    }
  });
});
