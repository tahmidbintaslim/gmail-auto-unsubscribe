import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

describe("store listing", () => {
  const summary = read("docs/store-listing.md").match(/```\n<!-- summary -->\n(.+)\n```/)?.[1];

  it("has a summary within the Chrome Web Store's 132-character limit", () => {
    expect(summary).toBeTruthy();
    expect(summary.length).toBeLessThanOrEqual(132);
    // Never lead with or imply Google; "Gmail" only as "for Gmail"-style use.
    expect(summary).not.toMatch(/Google|Gmail™/);
  });

  it("matches the manifest description", () => {
    expect(JSON.parse(read("manifest.json")).description).toBe(summary);
  });
});

describe("README", () => {
  it("is titled UnsubSweep", () => {
    expect(read("README.md").split("\n")[0]).toBe("# UnsubSweep");
  });
});
