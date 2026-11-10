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

  it("is branded UnsubSweep", () => {
    expect(manifest.name).toBe("UnsubSweep: Bulk Unsubscribe for Gmail");
    expect(manifest.short_name).toBe("UnsubSweep");
    expect(manifest.version).toBe("1.0.0");
  });

  it("ships icons of the declared size", () => {
    expect(Object.keys(manifest.icons).sort()).toEqual(["128", "16", "48"]);
    expect(manifest.action.default_icon).toEqual(manifest.icons);
    for (const [size, path] of Object.entries(manifest.icons)) {
      expect(existsSync(join(root, path)), path).toBe(true);
      const buf = readFileSync(join(root, path));
      // PNG signature, then IHDR width and height as big-endian uint32.
      expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([Number(size), Number(size)]);
    }
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
