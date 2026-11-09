# UnsubSweep Brand + v1 Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the existing zero-access engine to the Chrome Web Store as **UnsubSweep**, with a brand, a privacy policy, a landing page and launch copy.

**Architecture:** The engine (`unsubscriber.js`, `content.js`, `popup.js`) is unchanged. This plan adds:
- the brand mark, icons and design tokens, and a restyled popup;
- a packaging script that zips only the shipped files;
- a static `site/` (landing page and privacy policy) served by the existing Vercel config;
- Markdown copy for the store listing and the launch posts.

**Tech Stack:** Plain HTML/CSS/JS (no build step), Node 22+, Vitest + jsdom, the pre-installed Playwright (renders SVG to PNG icons), the system `zip`.

**Spec:** `docs/superpowers/specs/2026-11-09-product-strategy-design.md` (§0 Phase 1, §4, §6, §7 row 2)

## Global Constraints

- The permissions stay exactly `["activeTab", "scripting"]`: no `host_permissions`, `content_scripts` or `background` (enforced by `test/manifest.test.js`).
- Shipped files make no network calls and touch no storage; the existing privacy test must keep passing over every shipped file, icons excepted.
- Store name: `UnsubSweep: Bulk Unsubscribe for Gmail`. Never "Gmail" first, never imply Google endorsement.
- Store summary ≤ 132 characters (Chrome Web Store limit).
- The phase 1 privacy policy must **not** mention Google API "Limited Use"; it must state zero collection and zero network.
- Chrome Web Store account: **non-trader** (phase 1 is free).
- Voice: friendly, calm, a little cheeky. Hero counter "Swept: N senders".

## Review Focus

1. **Dark-mode popup:** a user on a dark OS theme opens the popup → text keeps at least 4.5:1 contrast. Pinned in Task 2 (`prefers-color-scheme: dark` block and token contrast test).
2. **The zip contains dev files** (tests, demo, node_modules) → the store rejects it, or it leaks the repo. Pinned in Task 3 (exact entry list).
3. **Icons the manifest doesn't reference, or a wrong size** → a blurry or missing toolbar icon. Pinned in Task 1 (PNG width and height read from the IHDR chunk).
4. **The privacy page drifts from the code**, for example by claiming no storage while code adds storage. Pinned by the existing privacy test plus Task 4's test that the policy's permission table lists exactly the manifest's permissions.
5. **A broken site route**: `/privacy` returns 404, so the store listing's policy URL is dead. Pinned in Task 4 (`vercel.json` rewrites test).

---

### Task 1: Rename, brand mark and icons

**Files:**
- Create: `brand/mark.svg` (broom mark, 128×128 viewBox, accent `#E8590C` on transparent)
- Create: `scripts/build-icons.mjs`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` (generated, committed)
- Modify: `manifest.json`, `package.json` (`name: "unsubsweep"`, script `"icons": "node scripts/build-icons.mjs"`)
- Test: `test/manifest.test.js`

**Interfaces:**
- Produces: `manifest.icons` and `manifest.action.default_icon` = `{ "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }`; `SHIPPED_ICONS` exported from `test/manifest.test.js` is not needed (Task 3 reads the manifest).

- [ ] **Step 1: Write failing tests** in `test/manifest.test.js`:
  - `"is branded UnsubSweep"`: `manifest.name === "UnsubSweep: Bulk Unsubscribe for Gmail"`, `manifest.version === "1.0.0"`, and `manifest.short_name === "UnsubSweep"`.
  - `"ships icons of the declared size"`: for each `[size, path]` of `manifest.icons`, the file exists, starts with the PNG signature, and the IHDR width and height (`buf.readUInt32BE(16)`, `buf.readUInt32BE(20)`) both equal `Number(size)`. Also `manifest.action.default_icon` deep-equals `manifest.icons`.
- [ ] **Step 2:** Run `npx vitest run test/manifest.test.js` → expect FAIL on the name and the missing icons.
- [ ] **Step 3:** Draw `brand/mark.svg`. Write `scripts/build-icons.mjs`: it launches chromium through `require('playwright')`, sets the viewport to each size at `deviceScaleFactor: 1`, renders the SVG with a transparent background (`omitBackground: true`) and writes `icons/icon{size}.png`. Run `npm run icons`.
- [ ] **Step 4:** Update `manifest.json`: name, short_name, version `1.0.0`, `description` = the store summary from Task 5, plus `icons` and `action.default_icon`.
- [ ] **Step 5:** Run `npm test` → PASS (the privacy test's `SHIPPED` list is unchanged).
- [ ] **Step 6:** Commit: `feat(brand): rename to UnsubSweep, add mark and icons`

### Task 2: Design tokens and popup restyle

**Files:**
- Modify: `popup.html` (inline `<style>` only; the extension has no build step)
- Test: `test/popup.test.js`

**Tokens.** Define these on `:root`, with dark values under `@media (prefers-color-scheme: dark)`:

| token | light | dark |
|---|---|---|
| `--bg` | `#FFFBF7` | `#1C1917` |
| `--fg` | `#1C1917` | `#FAF7F2` |
| `--muted` | `#57534E` | `#A8A29E` |
| `--accent` | `#C2410C` | `#FB923C` |
| `--accent-fg` | `#FFFFFF` | `#1C1917` |
| `--surface` | `#F5EFE6` | `#292524` |

- [ ] **Step 1: Write failing tests** in `test/popup.test.js`:
  - `"popup is branded"`: the `h1` text is `UnsubSweep`, and `#startBtn` text is `Start sweep`.
  - `"tokens meet contrast"`: parse the six hex pairs above from the popup's CSS. Compute the WCAG contrast ratio (a helper in the test file) and expect ≥ 4.5 for `fg/bg`, `muted/bg`, `accent-fg/accent` and `fg/surface`, in both themes.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Restyle `popup.html`. Change the `h3` to an `h1` with the 16px mark inline, set the button copy `Start sweep` / `Stop`, and apply the tokens. Keep every element id and the script order `unsubscriber.js, popup.js`.
- [ ] **Step 4:** Change `describeState` copy in `unsubscriber.js` for the `done` phase to start with `Swept: ` (for example `Swept: 12 senders, 3 skipped.`). Update the matching expectations in `test/unsubscriber.test.js` and `test/popup.test.js`.
- [ ] **Step 5:** Run `npm test` → PASS. Run `npm run demo` and take a 1× screenshot of the popup in light and dark (`emulateMedia({ colorScheme })`) for a visual check.
- [ ] **Step 6:** Commit: `feat(brand): tokens and restyled popup`

### Task 3: Packaging script

**Files:**
- Create: `scripts/package.mjs`
- Modify: `package.json` (script `"package": "node scripts/package.mjs"`), `.gitignore` (`dist/`), `.github/workflows/ci.yml` (add the steps `npm run package` and `unzip -l dist/unsubsweep-*.zip`)
- Test: `test/package.test.js`

**Interfaces:**
- Produces: `export function shippedFiles(manifest): string[]`, which returns `["manifest.json", "popup.html", "popup.js", "unsubscriber.js", "content.js", ...Object.values(manifest.icons)]`, deduplicated and sorted. `package.mjs` runs `zip -X dist/unsubsweep-${manifest.version}.zip <files>` from the repo root when run directly.

- [ ] **Step 1: Write failing tests**:
  - `shippedFiles(manifest)` equals the exact sorted list of the five files plus the three icon paths.
  - Every file it returns exists.
  - No entry starts with `test/`, `demo/`, `node_modules/` or `docs/`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `scripts/package.mjs`. Guard the zip call with `if (import.meta.url === pathToFileURL(process.argv[1]).href)`.
- [ ] **Step 4:** Run `npm test && npm run package && unzip -l dist/unsubsweep-1.0.0.zip` → PASS; `manifest.json` is listed at the archive root.
- [ ] **Step 5:** Commit: `build: package script for the Chrome Web Store zip`

### Task 4: Landing page and privacy policy

**Files:**
- Create: `site/index.html` (landing), `site/privacy.html` (policy)
- Modify: `vercel.json`: replace the `/` → `/demo/` redirect with the rewrites `{ "source": "/", "destination": "/site/index.html" }` and `{ "source": "/privacy", "destination": "/site/privacy.html" }`. `/demo/` keeps working.
- Test: `test/site.test.js`

**Content (privacy.html):** effective date 2026-11-09. It states:
- Single purpose.
- What the extension reads: button and link labels, sender row text and the tab address on the Manage subscriptions page (wording copied from README "What it never does").
- It collects, stores and transmits nothing, and has no analytics.
- A permissions table with one row per manifest permission and its justification.
- Contact: the repository's issues page.

**Content (index.html):**
- Hero "Bulk unsubscribe from Gmail. Without giving anyone your inbox."
- An "Add to Chrome" button: the store URL, as `#` until it exists.
- The demo GIF `docs/images/demo-run.gif`.
- Three "zero" points: zero access, zero servers, zero data.
- Links to `/privacy`, `/demo/` and GitHub.
- Same tokens as Task 2.

- [ ] **Step 1: Write failing tests**:
  - `privacy.html` contains `collects no`, does **not** match `/limited use/i`, and its permissions table's first-column codes equal `manifest.permissions` sorted.
  - `index.html` has `<a href="/privacy">` and `<a href="/demo/">`.
  - `vercel.json` has a rewrite for `/privacy` pointing at an existing file, and for `/`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Write both pages: the token CSS inline, responsive at 360px, no external scripts.
- [ ] **Step 4:** Run `npm test` → PASS. Run `npm run demo`, open `/site/index.html` at 360px and 1280px, and screenshot both for a visual check.
- [ ] **Step 5:** Commit: `feat(site): landing page and privacy policy`

### Task 5: Store listing and launch copy

**Files:**
- Create: `docs/store-listing.md`, `docs/launch.md`
- Modify: `README.md` (title, name, intro, install-from-store line, link to `/privacy`)
- Test: `test/store-listing.test.js`

**Interfaces:**
- `docs/store-listing.md` has a fenced block whose first line is `<!-- summary -->`, followed by the summary. The test reads it.

**Content:**
- **Summary:** `Bulk unsubscribe from Gmail newsletters in one click. Runs in your browser: no inbox access, no servers, no data.`
- **Store listing doc:**
  - The detailed description, adapted from the research blueprint (rename it, drop "Intercepts row-level search links", and say Go to website is off by default and capped at 5).
  - Single-purpose text, a justification for `activeTab` and for `scripting`.
  - Data usage: "I do not collect or use user data".
  - Account type: non-trader.
  - Screenshots: 1280×800 ×3 from the demo.
- **Launch doc:** the Show HN title and body, the X thread and the Product Hunt checklist from the blueprint, renamed to UnsubSweep and linking `unsubsweep.com`.

- [ ] **Step 1: Write the failing test:** the summary is ≤ 132 characters and contains neither "Google" nor "Gmail™"; `README.md`'s first line is `# UnsubSweep`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Write both docs and update the README.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit: `docs: store listing, launch copy, README rename`

### Task 6: Human launch checklist (not code)

These steps are done by the owner. Track them as a checklist in the PR body.

- [ ] Run a USPTO TESS and EUIPO eSearch for "UnsubSweep" in classes 9 and 42, and record the result in the spec.
- [ ] Register `unsubsweep.com` and `unsubsweep.app`; point `unsubsweep.com` at the Vercel project.
- [ ] Create a Chrome Web Store developer account ($5 one-time), non-trader.
- [ ] Upload `dist/unsubsweep-1.0.0.zip`. Paste the listing from `docs/store-listing.md`; set the privacy URL `https://unsubsweep.com/privacy`.
- [ ] **Test on a real Gmail account** before submitting. The engine has only been tested on fixtures (README status). Fix any label mismatches first.
- [ ] After approval, put the store URL into `site/index.html` and the README, then post following `docs/launch.md`.
