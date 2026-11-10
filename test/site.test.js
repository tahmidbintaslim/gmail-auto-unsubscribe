import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const doc = (file) => new JSDOM(read(file)).window.document;

describe("privacy policy", () => {
  const html = read("site/privacy.html");

  it("states zero collection and does not claim Google API Limited Use", () => {
    expect(html).toMatch(/collects no/i);
    // Phase 1 calls no Google API, so the Limited Use clause does not apply.
    expect(html).not.toMatch(/limited use/i);
  });

  it("lists exactly the manifest's permissions", () => {
    const codes = [...doc("site/privacy.html").querySelectorAll("#permissions tbody tr td:first-child code")].map(
      (el) => el.textContent,
    );
    expect(codes.sort()).toEqual([...manifest.permissions].sort());
  });
});

describe("network claims", () => {
  // The opt-in Go to website option opens the sender's page, so "no network
  // requests" must be scoped to the extension's own requests and say so.
  it.each(["site/privacy.html", "docs/store-listing.md"])("%s scopes the claim and discloses Go to website", (file) => {
    const text = read(file);
    expect(text).toMatch(/no network requests of its own/i);
    expect(text).toMatch(/Go to website[^.]*opens the sender's (?:own )?(?:page|site|website)/i);
    expect(text).not.toMatch(/shares nothing with anyone/i);
  });
});

describe("landing page", () => {
  it("shows a still image instead of the GIF when reduced motion is preferred", () => {
    const source = doc("site/index.html").querySelector('picture source[media="(prefers-reduced-motion: reduce)"]');
    expect(source?.getAttribute("srcset")).toBe("/docs/images/demo-done.png");
  });

  it("links to the privacy policy and the demo", () => {
    const hrefs = [...doc("site/index.html").querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/privacy");
    expect(hrefs).toContain("/demo/");
  });
});

describe("vercel.json", () => {
  const { rewrites = [] } = JSON.parse(read("vercel.json"));

  it.each(["/", "/privacy"])("rewrites %s to a page that exists", (source) => {
    const rule = rewrites.find((r) => r.source === source);
    expect(rule, source).toBeTruthy();
    expect(existsSync(join(root, rule.destination))).toBe(true);
  });
});
