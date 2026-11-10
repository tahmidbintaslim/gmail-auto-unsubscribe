# UnsubSweep — Product Strategy Design

Date: 2026-11-09 (rev. 2: phased strategy and name) · Sub-project 1 of 6

## 0. Decisions so far

| Question | Decision |
|---|---|
| Goal | Commercial product, launched in **two phases** |
| Phase 1 (v1) | **Free, open source, zero access.** The existing page-clicking engine ships to the Chrome Web Store with only `activeTab` + `scripting`: no OAuth, no host permission, no network. Wins trust and users fast. |
| Phase 2 (v2) | **Opt-in Pro**: Gmail API read in the browser, AI on-device or user's own key, no mail data on our servers. The free core keeps its zero-access promise. |
| Audience | Consumers first (personal Gmail), Workspace/team plan later |
| AI (v2) | Smart recommendations, sender categories, natural-language rules, newsletter digest (opt-in) |
| Name | **UnsubSweep**: "Bulk unsubscribe for Gmail" (v1), "AI inbox sweep" (v2) |

**Name check (2026-11-09):** existing "Unsub" products we must not collide with: Unsub (iOS subscription tracker, Product Hunt), Unsubly (Chrome Web Store), Unsubby (subscription-cancelling service), UnSubAll, EasyUnsub, Unsubmarine, Unsubscriber (Clean Email). A web search found no product called UnsubSweep. An RDAP lookup found `unsubsweep.com` and `unsubsweep.app` unregistered. A formal trademark search is still open **[verify]**.

**The prototype engine replaces the external "UnsubLocal" blueprint code.** The repo's engine already handles the blueprint's five Gmail gotchas, and the blueprint code has four problems we won't ship:
- It runs on every Gmail page with no address check, so it can click Unsubscribe inside an open message.
- "Go to website" is on by default with no cap on tabs.
- It confirms dialogs it did not open.
- It needs the `mail.google.com/*` host permission, which shows an install warning.

Unverified assumptions are marked **[verify]**. Each one is a task in the plan.

## 1. Product

**One-liner:** UnsubSweep finds the senders you never read and unsubscribes you in one click. It never sends your email to anyone.

**Problem:** Inboxes fill with newsletters and promotions. The existing tools either sold user data (Unroll.me) or run your mail through their servers (Clean Email, Leave Me Alone, Mailstrom). Gmail's own Manage subscriptions page has no ranking, no bulk action and no rules.

**Positioning:** *The unsubscribe assistant that never sees your email.* All mail processing happens in your browser. Our only server handles license keys.

**Tiers (open-core).** Phase 1 ships only the Free column's first row; everything else is phase 2.

| | Free | Pro (~$4/mo or $29/yr) | Team (later) |
|---|---|---|---|
| Quick mode (today's page-clicking engine, no Google sign-in, zero access) | ✓ unlimited | ✓ | ✓ |
| One-click unsubscribe through the Gmail API | 20 / month | Unlimited | Unlimited |
| AI recommendations + categories | Preview (top 5) | ✓ | ✓ |
| Natural-language rules (recurring) | – | ✓ | ✓ |
| Newsletter digest | – | ✓ | ✓ |
| Workspace admin install, shared rules | – | – | ✓ |

**Success metrics (first 90 days after launch):** 5k installs, 4.5★ or better on the store, 3% free→Pro conversion, a median of 30 or more senders unsubscribed in the first session, and no store or Google policy strikes.

## 2. Tech stack and architecture

```
┌──────────────── Chrome (user's machine) ───────────────────────────┐
│ Side panel UI (Preact)  ←→  Service worker                          │
│                             ├─ Gmail client (chrome.identity token) │
│                             ├─ Unsubscribe executor                 │
│                             ├─ Scoring + rules engine (pure TS)     │
│                             ├─ AI adapter: Gemini Nano | BYO Claude │
│                             └─ Store: chrome.storage.local          │
│ Quick mode: existing unsubscriber.js/content.js (no OAuth)          │
└─────────────────────────────────────────────────────────────────────┘
        │ license key only                 │ user's own key (opt-in)
        ▼                                  ▼
  Lemon Squeezy license API          api.anthropic.com
```

- **Build:** [WXT](https://wxt.dev) (Vite-based, Manifest V3) + TypeScript + Preact for the side panel. Keep Vitest and jsdom; Playwright for end-to-end tests.
- **Gmail access:** `chrome.identity.getAuthToken`. Scopes: `gmail.readonly` (restricted; needed for search, `List-Unsubscribe` headers and digest bodies) and `gmail.send` (sensitive; for `mailto:` unsubscribes). No `gmail.modify` in v1.
- **Unsubscribe executor**, in priority order:
  1. RFC 8058 one-click: `POST` `List-Unsubscribe=One-Click` to the https URL. A form-encoded `no-cors` fetch needs no host permission (verified 2026-11-09 in Chromium 153: the server receives the POST with the right content type and body; the response is opaque, so a 4xx/5xx looks like success, and a 302 is followed as GET).
  2. `mailto:`: send through `gmail.send`.
  3. Website link only: open a tab; the user finishes by hand.
  4. Fallback: Quick mode on Gmail's Manage subscriptions page.
- **Scoring (deterministic, no AI):** for each sender, from metadata: messages in the last 90 days, read ratio, days since last opened, whether you ever replied. AI only *explains* and *categorizes*. It never decides on its own.
- **AI adapter (one interface, two backends):**
  - **Default: Chrome built-in AI** (Prompt API, Gemini Nano, on-device, free) **[verify availability and hardware limits for extensions]**.
  - **Optional: BYO Anthropic key**, stored in `chrome.storage.local` and called from the browser (`anthropic-dangerous-direct-browser-access` header). Default model: a Haiku-class model for categories; a Sonnet-class model for rules parsing and digests.
  - Input: sender name, domain and subject lines. Digest only: bodies of newsletters the user *keeps*, after explicit opt-in.
- **NL rules:** the AI turns text into a JSON rule (`{match:{category,domainIn,notOpenedDays}, action:"unsubscribe", schedule:"weekly"}`). The user reviews it before it is saved. A `chrome.alarms` alarm runs saved rules and asks for confirmation before acting, unless the user turns on auto-run per rule.
- **Licensing:** Lemon Squeezy (merchant of record, so it handles VAT and sales tax). The extension checks the key with its license API. **No backend of our own in v1.**
- **Landing page:** a static site on Vercel (`vercel.json` already exists).
- **Safety rails carried over from the prototype:** a per-run cap, a review screen before any bulk action, a local log of every unsubscribe (sender, method, time), and no deleting or archiving of mail in v1.

## 3. Claude ecosystem: MCP, Skill, Plugin, Connector

| Piece | v1? | Design |
|---|---|---|
| **MCP server** (`@unsubsweep/mcp`, local stdio, Node) | ✓ | Same scoring and executor code as a shared TS package. Signs in with an OAuth "Desktop app" client in the **same Google Cloud project**, so one verification covers both **[verify]**. Tools: `list_subscriptions`, `recommend_unsubscribes`, `categorize_senders`, `unsubscribe` (needs `confirm: true` and a sender list), `digest_newsletters`. Pro license key checked at startup. |
| **Claude Skill** (`inbox-cleanup/SKILL.md`) | ✓ | Teaches Claude the workflow: list → explain recommendations → ask the user → unsubscribe in batches → report. Never unsubscribes without explicit confirmation. |
| **Claude Code plugin** | ✓ | Bundles the MCP config and the skill so they install with one command. |
| **claude.ai remote connector** | ✗ (phase B) | Needs a hosted server holding Gmail tokens, which breaks local-first and triggers CASA. Revisit after there is revenue. |

## 4. Legal, compliance, open source

- **Google OAuth verification.** Start the day the consent screen exists; it takes weeks. Restricted scopes need a demo video, a privacy policy on our own domain, and a security assessment. Google may waive the assessment for apps that keep restricted data on the user's device **[verify with Google; budget $500–4.5k/yr if not waived]**.
- **Google API Services User Data Policy, Limited Use:** state it word for word in the privacy policy and the store listing. Never use Gmail data for ads, never sell it, no human reads it.
- **Chrome Web Store:** single-purpose description, data-use disclosures, a justification for each permission. Write "for Gmail" and never imply Google endorsement.
- **Privacy policy and ToS:** short and plain. Mail data never leaves the device except (a) to the user's chosen AI provider when they turn on BYO key, and (b) unsubscribe requests to the sender. GDPR and CCPA load is light because we hold no mail data. Lemon Squeezy is the processor for billing data.
- **Anthropic:** BYO-key users fall under Anthropic's usage policies on their own account. Say so in the settings.
- **Open source:**
  - The core engine, Quick mode, the MCP server and the skill stay **MIT** (keeps the current license).
  - Pro features (rules, digest, licensing) sit in a separate proprietary package.
  - Contributions use DCO sign-off, not a CLA.
  - Add `SECURITY.md` and a responsible-disclosure address.
- **Trademark:** run a USPTO and EUIPO search on "UnsubSweep" and register `unsubsweep.com` and `unsubsweep.app` before any public launch **[verify]**.
- **Phase 1 privacy policy:** zero collection, zero network, and no storage beyond the run counts kept in memory. **Do not** cite Google API Limited Use in phase 1, because no Google API is used. Add it in phase 2.
- **Chrome Web Store trader status:**
  - Phase 1 is free with no monetization, so "non-trader" is accurate.
  - Before Pro launches, switch to **trader**: EU rules then show a business address and contact on the listing. Plan for a business address or registered company so it isn't a home address.

## 5. User research plan

1. **Desk research, week 1:** mine 1–3★ reviews of five competitors on the Chrome Web Store, Reddit (r/gmail, r/privacy, r/productivity) and Product Hunt. Tag pains: trust, broken unsubscribes, price, speed.
2. **Fake-door landing page, weeks 1–2:** the positioning, the price and a waitlist. Measure signup rate by traffic source.
3. **Twelve interviews, weeks 2–3:** six heavy-inbox consumers and six Workspace professionals. Questions: last time you cleaned your inbox, what stopped you, would you give an extension Gmail access, what makes you trust it.
4. **Usability test of the review screen** with five users before launch. Do they understand *why* each sender was recommended?

Synthesize into personas and a ranked pain list; that feeds sub-project 2.

## 6. Branding and marketing

- **Voice:** friendly, calm, a little cheeky ("Swept: 143 senders."). Never "productivity hustle".
- **Wedge (phase 1):** *zero access, local-first*. "Bulk unsubscribe without giving anyone your inbox." Use the HN, X and Product Hunt playbook from the UnsubLocal research, renamed.
- **Visual direction (detailed in sub-project 2):** one warm accent color, a broom mark, and a big counter of senders swept as the hero moment.
- **Launch:**
  - Chrome Web Store SEO: "unsubscribe Gmail", "bulk unsubscribe".
  - Show HN and Product Hunt with the privacy story and an architecture diagram.
  - Reddit posts that lead with value.
  - A shareable "I swept 143 senders" card.
- **Ongoing:**
  - SEO pages "How to unsubscribe from {brand}", generated for the most common senders.
  - The open-source repo as a trust signal.
  - MCP and skill listed in the Claude and MCP directories.

## 7. Sub-project roadmap

| # | Sub-project | Phase | Depends on | Rough size |
|---|---|---|---|---|
| 1 | Product strategy (this doc) | – | – | done |
| 2 | **Brand + v1 launch:** name clearance, logo/icons, tokens, popup restyle, store listing, privacy policy page, landing page, launch posts | 1 | 1 | 1–2 wk |
| 3 | **Extension v2 core:** WXT migration, OAuth, Gmail client, executor, scoring, review UI. **Start OAuth verification here** | 2 | 1 (runs in parallel with 2) | 3–4 wk |
| 4 | AI layer: adapter, categories, explanations, NL rules, digest, licensing | 2 | 3 | 3 wk |
| 5 | MCP server, Skill and Claude Code plugin | 2 | 3 (shared package) | 1–2 wk |
| 6 | Pro launch: trader status, Pro privacy policy, verification sign-off, marketing | 2 | 4 | 2 wk |

User research (§5) runs alongside 2 and 3.

## 8. Out of scope for v1

Hosted cloud tier and claude.ai connector, Outlook and other providers, mobile, deleting or archiving mail, team admin console.
