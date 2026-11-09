# UnsubSweep v2 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Gmail API core of UnsubSweep: sign in, find subscribed senders from `List-Unsubscribe` headers, rank them, and unsubscribe the ones the user picks. It all runs in the browser, and the v1 extension keeps working unchanged.

**Architecture:**
- A new WXT + TypeScript extension in `ext/`.
- Pure logic lives in `ext/lib/` (header parsing, scoring, the executor), with no `chrome.*` calls, so the phase 2 MCP server (sub-project 5) can reuse it.
- `ext/lib/gmail.ts` is the only module that talks to Gmail.
- A Preact side panel shows the review list.
- v1 (repo root) is untouched until v2 replaces it at the Pro launch.

**Tech Stack:** WXT (latest stable), TypeScript strict, Preact, Vitest + jsdom (already in the repo), `chrome.identity`, Gmail REST API v1.

**Spec:** `docs/superpowers/specs/2026-11-09-product-strategy-design.md` (§0 Phase 2, §2, §4 OAuth, §7 row 3)

## Global Constraints

- OAuth scopes exactly `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/gmail.send`. No `gmail.modify`.
- No server of ours: mail data never leaves the browser except unsubscribe requests sent to the sender.
- Never delete, archive or label mail.
- Executor order: RFC 8058 one-click POST → `mailto:` through `gmail.send` → open the website in a tab.
- AI is **out of scope** (sub-project 4). Scoring is deterministic and explainable.
- The free-tier monthly cap and licensing are **out of scope** (sub-project 4).
- Safety rails: a review screen before any action, a per-run cap of 250, and a local log of every unsubscribe as `{sender, method, at, ok}` in `chrome.storage.local`.
- `ext/lib/*` must not reference `chrome` (enforced by a test), so the MCP server can import it.
- The root `npm test` runs both the v1 and the v2 tests.

## Review Focus

1. **Malformed `List-Unsubscribe` headers** (missing angle brackets, several URLs, whitespace and line folding, `mailto:` with `?subject=`) → parse what is valid and ignore the rest; never throw. Pinned in Task 2.
2. **A one-click POST to a sender that redirects or errors** → an opaque response counts as "sent" and the log records `ok: true`. A network error falls through to the next method, never a crash. Pinned in Task 5.
3. **Token expired mid-run (401)** → refresh the token once and retry; if that fails, stop the run with a "sign in again" state instead of skipping every sender. Pinned in Task 3.
4. **Gmail rate limit (429 / `rateLimitExceeded`)** → back off and retry, up to 3 tries per request. Pinned in Task 3.
5. **A sender with both one-click and mailto, where one-click fails** → falls through to mailto exactly once; it is never unsubscribed twice. Pinned in Task 5.

---

### Task 1: Start Google OAuth verification and run the spike (human + throwaway)

Do this first: Google's verification takes weeks.

- [ ] Create the Google Cloud project `unsubsweep`, enable the Gmail API, and fill in the External consent screen: app name UnsubSweep, home page `https://unsubsweep.com`, privacy `https://unsubsweep.com/privacy` (from the v1 plan), and the two scopes above.
- [ ] Create a "Chrome extension" OAuth client bound to a fixed extension ID: generate a key, put `key` in the dev manifest, and record the ID in `ext/README.md`.
- [ ] Submit for verification once the Task 6 UI exists. Needs a demo video showing scope use and a justification per scope. Ask Google in writing whether the security assessment applies to a client-only extension, and record the answer in the spec **[verify]**.
- [ ] **Spike (throwaway, not committed):** in an MV3 service worker with **no host permissions**, run `fetch(url, {method: "POST", mode: "no-cors", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: "List-Unsubscribe=One-Click"})` against a local test server. Confirm the request arrives with that body. Record the yes/no in the spec. If no, Task 5 adds `optional_host_permissions: ["https://*/*"]`, requested per run.

### Task 2: WXT scaffold and the `List-Unsubscribe` parser

**Files:**
- Create: `ext/package.json`, `ext/wxt.config.ts`, `ext/tsconfig.json`, `ext/entrypoints/background.ts` (empty listener), `ext/lib/listUnsubscribe.ts`
- Modify: root `package.json`: scripts `"test": "vitest run"` is unchanged; `vitest.config.mjs` includes `ext/**/*.test.ts`
- Test: `ext/lib/listUnsubscribe.test.ts`, `ext/lib/purity.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type UnsubMethods = { oneClickUrl?: string; mailto?: string; url?: string };
  export function parseListUnsubscribe(listUnsubscribe: string | undefined, listUnsubscribePost: string | undefined): UnsubMethods;
  ```
- Rules:
  - Take each `<...>` entry. The first `https:` entry becomes `url`, and also `oneClickUrl` when `listUnsubscribePost` matches `/List-Unsubscribe=One-Click/i`.
  - The first `mailto:` entry becomes `mailto`.
  - Ignore `http:` entries for one-click (RFC 8058 requires HTTPS), but keep them as `url` when there is no https one.

- [ ] **Step 1: Write failing tests:**
  - `<https://a.co/u?x=1>, <mailto:u@a.co?subject=unsub>` with post `List-Unsubscribe=One-Click` → `{oneClickUrl:"https://a.co/u?x=1", url:"https://a.co/u?x=1", mailto:"mailto:u@a.co?subject=unsub"}`.
  - Same without a post header → no `oneClickUrl`.
  - `<mailto:u@a.co>` only → `{mailto}`.
  - Folded whitespace `"<https://a.co/u>,\r\n <mailto:x@a.co>"` parses.
  - Garbage, `""` or `undefined` → `{}`, with no throw.
  - `<http://a.co/u>` with post → `{url:"http://a.co/u"}` and no `oneClickUrl`.
  - `purity.test.ts`: no file in `ext/lib/` (tests excluded) matches `/\bchrome\./`.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Scaffold with `npx wxt@latest init ext --template vanilla-ts`, add Preact, and implement the parser.
- [ ] **Step 4:** Run `npm test` → PASS; `cd ext && npx wxt build` succeeds.
- [ ] **Step 5:** Commit: `feat(v2): WXT scaffold and List-Unsubscribe parser`

### Task 3: Gmail client

**Files:**
- Create: `ext/lib/gmail.ts`
- Test: `ext/lib/gmail.test.ts`

**Interfaces:**
- Consumes: `parseListUnsubscribe`.
- Produces:
  ```ts
  export type GetToken = (opts: { refresh: boolean }) => Promise<string>;
  export type SenderStats = { email: string; name: string; domain: string; messages90d: number; unread: number;
    lastOpenedAt: number | null; lastSeenAt: number; replied: boolean; methods: UnsubMethods };
  export class AuthError extends Error {}
  export function createGmail(getToken: GetToken, fetchFn?: typeof fetch): {
    listSubscribedSenders(now: number, onProgress?: (done: number, total: number) => void): Promise<SenderStats[]>;
    sendRaw(rfc822: string): Promise<void>;
  };
  ```
- Behavior:
  - Query `q = "newer_than:90d has:list-unsubscribe"` (verify the operator in Task 1's spike; otherwise list `category:promotions OR category:updates` and keep only messages that have the header).
  - Page through `users.messages.list` (`maxResults=500`). For each message, call `messages.get?format=metadata&metadataHeaders=From&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post`, at most 10 concurrent.
  - Group by lower-cased From address. `unread` = messages with the `UNREAD` label. `lastOpenedAt` = newest `internalDate` without `UNREAD`.
  - `replied` = any message to that address in `in:sent newer_than:365d`: one `messages.list` per sender, done only for senders that make it into the result.
  - `methods` come from the newest message.
  - `sendRaw` POSTs base64url(rfc822) to `users.messages.send`.
- Errors:
  - On a 401, call `getToken({refresh:true})` once and retry; if it fails again, throw `AuthError`.
  - On 429 or 403 with `rateLimitExceeded`, back off 1s, 2s, 4s and then throw.

- [ ] **Step 1: Write failing tests** with a fake `fetchFn` that serves canned list/get JSON:
  - Grouping: 3 messages from the same sender, 2 of them `UNREAD` → `messages90d:3, unread:2`, and `lastOpenedAt` = the read message's date.
  - Pagination follows `nextPageToken`.
  - A 401 then a 200 → one refresh and success; 401 twice → rejects with `AuthError`.
  - 429 ×2 then 200 → success after 2 retries (inject a fake `sleep`); 429 ×4 → rejects.
  - `sendRaw("To: u@a.co\r\n\r\nunsubscribe")` posts `{raw}` where `raw` is base64url with no `=` padding.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Add `sleep` as an optional third parameter for tests.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `feat(v2): Gmail client with retry and token refresh`

### Task 4: Scoring

**Files:**
- Create: `ext/lib/score.ts`
- Test: `ext/lib/score.test.ts`

**Interfaces:**
- Consumes: `SenderStats`.
- Produces:
  ```ts
  export type Scored = SenderStats & { score: number; recommend: boolean; reasons: string[] };
  export function scoreSender(s: SenderStats, now: number): Scored;
  export function rankSenders(list: SenderStats[], now: number): Scored[]; // score desc, then messages90d desc
  ```
- Formula: these weights decide who gets recommended, so they are fixed here.
  ```
  if replied → score 0, recommend false, reasons ["You've replied to this sender"]
  unreadRatio = unread / messages90d
  volume      = min(1, messages90d / 30)
  staleness   = lastOpenedAt == null ? 1 : min(1, daysSince(lastOpenedAt) / 90)
  score       = round2(0.5*unreadRatio + 0.3*volume + 0.2*staleness)
  recommend   = score >= 0.6
  reasons     (each that applies, in this order):
    unreadRatio >= 0.8 → "You opened {read} of {messages90d} emails"
    messages90d >= 12  → "{messages90d} emails in 90 days"
    lastOpenedAt null  → "Never opened"   else days >= 60 → "Last opened {days} days ago"
  ```

- [ ] **Step 1: Write failing tests:**
  - 30 messages, 30 unread, never opened → score 1, recommend, reasons `["You opened 0 of 30 emails", "30 emails in 90 days", "Never opened"]`.
  - 3 messages, 0 unread, opened today → score `0.03`, not recommended, reasons `[]`.
  - `replied:true` with every metric maxed → score 0, not recommended.
  - `messages90d: 0` → no NaN; score uses unreadRatio 0.
  - `rankSenders` puts a tie on score in `messages90d` descending order.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `feat(v2): deterministic sender scoring`

### Task 5: Unsubscribe executor and log

**Files:**
- Create: `ext/lib/executor.ts`
- Test: `ext/lib/executor.test.ts`

**Interfaces:**
- Consumes: `UnsubMethods`, `createGmail(...).sendRaw`.
- Produces:
  ```ts
  export type LogEntry = { sender: string; method: "one-click" | "mailto" | "website" | "none"; at: number; ok: boolean };
  export type ExecDeps = { post: (url: string) => Promise<void>; sendRaw: (raw: string) => Promise<void>;
    openTab: (url: string) => Promise<void>; now: () => number };
  export const MAX_PER_RUN = 250;
  export async function unsubscribeOne(sender: string, m: UnsubMethods, deps: ExecDeps): Promise<LogEntry>;
  export async function runBatch(items: { sender: string; methods: UnsubMethods }[], deps: ExecDeps,
    signal?: AbortSignal, onEntry?: (e: LogEntry) => void): Promise<LogEntry[]>;
  ```
- Behavior of `unsubscribeOne`:
  - Try `oneClickUrl` with `post`.
  - If `post` rejects, try `mailto`: build an RFC 822 message `To:` from the mailto address, `Subject:` from `?subject=` or `unsubscribe`, body from `?body=` or `unsubscribe`, then call `sendRaw`.
  - If that is missing or fails, use `url` with `openTab`; `ok` is true because the user finishes on the site.
  - If nothing is available, return `method:"none", ok:false`.
  - Never more than one successful method per sender.
- Behavior of `runBatch`: processes items in order, stops at `MAX_PER_RUN` or when the signal aborts, and deduplicates senders.
- In `entrypoints/background.ts`:
  - `post` = the spike-confirmed `fetch(..., {mode:"no-cors", ...})`.
  - Append each entry to `chrome.storage.local` key `log` (an array, capped at 5000, oldest dropped).

- [ ] **Step 1: Write failing tests:**
  - One-click succeeds → `{method:"one-click", ok:true}`; `sendRaw` and `openTab` are not called.
  - One-click rejects, mailto present → `method:"mailto"`, and the raw message contains `To: u@a.co` and `Subject: unsub` (from `?subject=unsub`).
  - Both missing, url present → `method:"website"` and `openTab` is called once.
  - `{}` → `{method:"none", ok:false}`.
  - `runBatch` with 300 items → 250 entries.
  - An abort after the 2nd entry → 2 entries.
  - Duplicate senders → processed once.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `feat(v2): unsubscribe executor with fallbacks and run cap`

### Task 6: Side panel review UI

**Files:**
- Create: `ext/entrypoints/sidepanel/index.html`, `ext/entrypoints/sidepanel/App.tsx`, `ext/entrypoints/sidepanel/style.css` (tokens copied from the v1 plan's Task 2)
- Modify: `ext/wxt.config.ts`: manifest `permissions: ["identity", "storage", "sidePanel"]`, `oauth2: { client_id, scopes }`, `side_panel.default_path`, and `action` opens the side panel.
- Test: `ext/entrypoints/sidepanel/App.test.tsx`

**Interfaces:**
- Consumes: `createGmail`, `rankSenders`, `runBatch`, `LogEntry`.
- `App` takes `props: { scan: () => Promise<Scored[]>; run: (items: Scored[], onEntry: (e: LogEntry) => void) => Promise<void> }`, so the tests inject fakes. `main.tsx` wires in the real ones through the background service worker.
- States:
  - `signed-out`: a "Connect Gmail" button, plus one line: "Your email stays in this browser."
  - `scanning`: a progress line.
  - `review`: the list, recommended senders pre-checked, each row showing the name, domain, reasons and a method badge.
  - `running`: the "Swept: N" counter.
  - `done`.
  - `error`: shows "Sign in again" on `AuthError`.
- The "Unsubscribe from N senders" button is disabled at 0 and asks for confirmation (`confirm` dialog text: `Unsubscribe from N senders? This can't be undone.`).

- [ ] **Step 1: Write failing tests** (render with `preact` into jsdom):
  - After a scan of 3 fake senders (2 recommended), 2 checkboxes are checked and the button reads `Unsubscribe from 2 senders`.
  - Unchecking all → the button is disabled.
  - Clicking with `window.confirm` stubbed to false → `run` is not called.
  - When `run` emits 2 entries → the text `Swept: 2` appears.
  - `scan` rejecting with `AuthError` → a `Sign in again` button appears.
  - Every checkbox has an accessible name equal to the sender's name.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Build with `cd ext && npx wxt build`, load `ext/.output/chrome-mv3` unpacked, and sign in with a **test Google account** listed as a test user on the consent screen. Scan, unsubscribe from 2 senders, and check the log in `chrome.storage.local`. Record the result in the PR.
- [ ] **Step 6:** Commit: `feat(v2): side panel review and run UI`
- [ ] **Step 7:** Record the demo video for Google verification (Task 1) from this build.
