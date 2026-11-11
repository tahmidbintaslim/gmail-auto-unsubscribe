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
  const html = read("web/privacy.html");

  it("states zero collection and does not claim Google API Limited Use", () => {
    expect(html).toMatch(/collects no/i);
    // Phase 1 calls no Google API, so the Limited Use clause does not apply.
    expect(html).not.toMatch(/limited use/i);
  });

  it("lists exactly the manifest's permissions", () => {
    const codes = [...doc("web/privacy.html").querySelectorAll("#permissions tbody tr td:first-child code")].map(
      (el) => el.textContent,
    );
    expect(codes.sort()).toEqual([...manifest.permissions].sort());
  });
});

describe("network claims", () => {
  // The opt-in Go to website option opens the sender's page, so "no network
  // requests" must be scoped to the extension's own requests and say so.
  it.each(["web/privacy.html", "docs/store-listing.md"])("%s scopes the claim and discloses Go to website", (file) => {
    const text = read(file);
    expect(text).toMatch(/no network requests of its own/i);
    expect(text).toMatch(/Go to website[^.]*opens the sender's (?:own )?(?:page|site|website)/i);
    expect(text).not.toMatch(/shares nothing with anyone/i);
  });
});

describe("landing page", () => {
  // The header and footer are inlined into every page at build time.
  const html = ["web/index.html", "web/src/partials/header.html", "web/src/partials/footer.html"].map(read).join("\n");

  it("links to the privacy policy, features, docs and the demo", () => {
    const hrefs = [...new JSDOM(html).window.document.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const href of ["/privacy", "/features/", "/docs/", "/try/", "/demo/"]) expect(hrefs).toContain(href);
  });

  it("puts the hero headline in the HTML, not behind JavaScript", () => {
    expect(new JSDOM(html).window.document.querySelector("h1").textContent).toMatch(/Bulk unsubscribe from Gmail/);
  });

  it("loads no 3D or scroll animation when reduced motion is preferred", () => {
    const main = read("web/src/main.ts");
    expect(main).toMatch(/prefers-reduced-motion: reduce/);
    expect(main).toMatch(/if \(!reducedMotion\)/);
    // three.js and GSAP only ever arrive through dynamic imports inside enhance().
    expect(main).not.toMatch(/^import /m);
  });

  it("labels every Pro mention on the features page as in development", () => {
    const pro = new JSDOM(read("web/features/index.html")).window.document.querySelector(".pro");
    expect(pro.textContent).toMatch(/In development/);
  });
});

describe("vercel.json", () => {
  const config = JSON.parse(read("vercel.json"));

  it("builds the site from web/", () => {
    expect(config.outputDirectory).toBe("web/dist");
    expect(config.buildCommand).toContain("--prefix web");
  });

  it.each(["/privacy", "/privacy/"])("rewrites %s to the built privacy page", (source) => {
    const rule = config.rewrites.find((r) => r.source === source);
    expect(rule?.destination).toBe("/privacy.html");
    expect(existsSync(join(root, "web/privacy.html"))).toBe(true);
  });
});
