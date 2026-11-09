import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { shippedFiles } from "../scripts/package.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));

describe("shippedFiles", () => {
  it("lists exactly the extension files and icons", () => {
    expect(shippedFiles(manifest)).toEqual([
      "content.js",
      "icons/icon128.png",
      "icons/icon16.png",
      "icons/icon48.png",
      "manifest.json",
      "popup.html",
      "popup.js",
      "unsubscriber.js",
    ]);
  });

  it("lists only files that exist and no dev files", () => {
    for (const file of shippedFiles(manifest)) {
      expect(existsSync(join(root, file)), file).toBe(true);
      expect(file).not.toMatch(/^(test|demo|node_modules|docs)\//);
    }
  });
});
