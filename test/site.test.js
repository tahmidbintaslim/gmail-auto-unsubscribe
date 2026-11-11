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

  it("links to the privacy policy, help, the demo and both in-page sections", () => {
    const hrefs = [...new JSDOM(html).window.document.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const href of ["/privacy", "/docs/", "/try/", "/demo/", "/#how", "/#safe"]) expect(hrefs).toContain(href);
    const doc = new JSDOM(html).window.document;
    for (const id of ["how", "safe", "plans"]) expect(doc.getElementById(id), id).toBeTruthy();
  });

  it("puts the hero headline in the HTML, not behind JavaScript", () => {
    expect(new JSDOM(html).window.document.querySelector("h1").textContent).toMatch(/Unsubscribe from every newsletter in one click/);
  });

  it("loads no scroll animation when reduced motion is preferred", () => {
    const main = read("web/src/main.ts");
    expect(main).toMatch(/prefers-reduced-motion: reduce/);
    expect(main).toMatch(/if \(!reducedMotion\) requestAnimationFrame/);
    // GSAP only ever arrives through a dynamic import inside reveal().
    expect(main).not.toMatch(/^import /m);
  });

  it("labels every Pro block as in development", () => {
    const doc = new JSDOM(html).window.document;
    const pro = [...doc.querySelectorAll(".pro")];
    expect(pro.length).toBe(2);
    for (const el of pro) expect(el.textContent).toMatch(/In development/);
  });

  it("is honest about the limits next to the claims", () => {
    expect(html).toMatch(/no undo/i);
    expect(html).toMatch(/not yet on a live account/i);
    // No invented proof: the product has no users or reviews yet.
    expect(html).not.toMatch(/reviews|rated|trusted by|loved by|users worldwide/i);
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
