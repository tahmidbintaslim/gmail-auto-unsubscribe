# UnsubSweep Website — Design

Date: 2026-11-10 · Approved in chat · Replaces the static `site/`

## Goal

An iconic, interactive product site that:
- explains UnsubSweep's features;
- demonstrates it;
- documents it for users and developers;
- hosts the privacy policy the Chrome Web Store listing links to.

The site must stay honest. v1 (free, zero access) is available now. The Pro AI features (v2) are labelled **In development**.

## Stack

- Vite + TypeScript as a multi-page app in `web/`, with exact-pinned dependencies.
- GSAP + ScrollTrigger for motion. three.js for the hero, lazy-loaded after first paint.
- No React. GSAP covers the motion that Framer Motion would.
- Design tokens are the same as `popup.html`: warm off-white, `#C2410C` / `#FB923C` accent, dark mode through `prefers-color-scheme`.
- Self-hosted fonts or system fonts. No third-party trackers or analytics, which matches the privacy story.

## Pages

| Route | Content |
|---|---|
| `/` | The three.js hero: a field of envelopes that a broom sweeps away as you scroll, with the headline "Bulk unsubscribe from Gmail. Without giving anyone your inbox." Then: a pinned 3-step "How it works" scroll; a "Zero access" section with an animated data-flow diagram showing what stays in the browser; feature highlights; Free vs Pro (AI column marked "In development"); FAQ; final call to action. |
| `/features/` | Sections for each v1 capability (one-click confirm, website fallback with a cap, stop rules, live counts, two permissions). A Pro AI section covers smart recommendations, categories, plain-English rules and the newsletter digest, each with an animated mock UI and an "In development" badge, plus a "Watch on GitHub" call to action. |
| `/demo/` | The existing live demo, unchanged, served at the same path. |
| `/try/` | A browser-chrome frame around `/demo/`, with a guided step list beside it. |
| `/docs/` | Users: install (Load unpacked now, store later), use, permissions, what it never does, troubleshooting, FAQ. Developers: repo layout, tests, the v2 `ext/` setup (OAuth client, key), and the roadmap (AI layer, Claude MCP server, Skill, plugin). |
| `/privacy` | The current policy text, unchanged in substance, at the same URL (+ `/privacy/`). |

## Quality bar

- **Reduced motion.** `prefers-reduced-motion: reduce` means no WebGL and no scroll-jacking. Static art and plain sections replace them, and everything is still readable.
- **No WebGL or a slow device.** Fall back to a static hero image. On phones, use fewer particles and a lower device pixel ratio.
- **Accessibility.**
  - No horizontal scroll at 360px.
  - Keyboard reachable, with visible focus.
  - One `h1` per page and semantic landmarks.
  - Text contrast ≥ 4.5:1 in both themes.
  - The canvas is `aria-hidden` and has a text equivalent.
- **Performance.**
  - Hero text renders before any JS runs.
  - three.js loads with a dynamic import after first paint.
  - Images are lazy.

## Build and deploy

- `vercel.json`:
  - build: `npm ci --prefix web && npm run build --prefix web`;
  - output: `web/dist`.
- A copy step puts these into `web/dist` so `/demo/` keeps working:
  - `demo/`;
  - `test/fixtures/`;
  - the v1 extension files the demo fetches;
  - `icons/`;
  - `docs/images/`.
- CI adds the web install and build steps.

## Tests

- **Site tests** (`test/site.test.js`) point at the built pages. The privacy checks stay as they are:
  - no "Limited Use";
  - the permissions table matches the manifest;
  - the network claim is scoped and discloses Go to website.
- **Routes:** the landing page links to `/privacy`, `/docs/`, `/features/` and `/demo/`.
- **Smoke test (Playwright):** every route loads with no console errors, under both normal and reduced motion, at 360px and 1280px.

## Out of scope

- Payments and sign-up.
- A real waitlist backend. The notify link points to GitHub releases/watch.
- Building the AI features themselves.
