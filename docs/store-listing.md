# Store listing: UnsubSweep

Paste these fields into each store's dashboard (Chrome, Edge, Opera, Firefox); per-store steps are in [`submission.md`](submission.md). Package: `npm run package` → `dist/unsubsweep-<version>.zip`.

## Name

`UnsubSweep: Bulk Unsubscribe for Gmail™` (same as `manifest.json`). Google's branding rules want "for" plus ™ when a name refers to a Google product: https://developer.chrome.com/docs/webstore/branding

## Summary

The summary must match `manifest.json` `description` (a test checks both).

```
<!-- summary -->
Bulk unsubscribe from Gmail newsletters in one click. Runs in your browser: no inbox access, no servers, no data.
```

## Category and language

Productivity (Workflow & Planning). English.

## Detailed description

```
Clean out newsletters without handing your inbox to anyone.

UnsubSweep works through Gmail's own "Manage subscriptions" page for you. Press Start and it unsubscribes from each sender in turn, confirming Gmail's dialog, right in the Gmail tab you already have open. No sign-in, no Google API access, no servers, no tracking.

Most unsubscribe tools ask for full read access to your email and process it on their servers. UnsubSweep does the clicks you would make yourself, locally, and nothing more.

HOW IT WORKS
1. In Gmail on your computer, open "Manage subscriptions" in the left menu (it may be under "More").
2. Click the UnsubSweep icon and press "Start sweep".
3. Leave the tab alone while it runs. Press Stop at any time.

WHAT IT DOES
• Unsubscribes from each sender on the page, one at a time, and confirms Gmail's one-click Unsubscribe dialog.
• Skips senders without one-click unsubscribe. Optional: open their "Go to website" page instead (off by default, at most 5 per run).
• Shows live counts. Stops by itself if you leave the page, after 250 senders, or if a dialog misbehaves.

PRIVACY
• Two permissions: activeTab and scripting. No access to any site until you open the popup on Gmail and press Start.
• Never opens, reads, moves or deletes your email.
• No network requests of its own, no storage, no analytics. The optional Go to website setting opens the sender's own page in a new tab, as Gmail's button does. The source is open: github.com/tahmidbintaslim/gmail-auto-unsubscribe

There is no undo: a run unsubscribes from every sender on the page. Works with Gmail's English interface.

UnsubSweep is not affiliated with or endorsed by Google. Gmail is a trademark of Google LLC. Use of this trademark is subject to Google Permissions.
```

## Privacy practices tab

- **Single purpose:** On Gmail's Manage subscriptions page, clicks Unsubscribe for each sender in turn and confirms Gmail's dialog, after the user presses Start.
- **`activeTab` justification:** Gives the extension access to the Gmail tab the user opened the popup from, only when they open it, so it can check the page is Manage subscriptions and run there. It has no access to any other tab or site.
- **`scripting` justification:** Injects the extension's own two script files (`unsubscriber.js`, `content.js`) into that tab when the user presses Start. No remote code; nothing runs before Start.
- **Remote code:** No, I am not using remote code.
- **Data usage:** Google counts data handled only on the device as user data too (https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), so disclose what it reads:
  - Tick **Website content** (it reads the Manage subscriptions page) and **Personally identifiable information** (that page shows sender names and email addresses).
  - Tick all three certifications: not sold to third parties, not used for unrelated purposes, not used for creditworthiness or lending.
  - If a free-text box is offered: "Read only in the user's own browser tab while a run is going, to find and press Unsubscribe. Never stored, never transmitted."
  - Edge Partner Center asks the same question; give the same answer there.
- **Privacy policy URL:** `https://unsubsweep.vercel.app/privacy` (live). Switch to `https://unsubsweep.com/privacy` once the domain points at the Vercel project.

## Account

- Trader status: **non-trader** (free, no monetization). Switch to trader before any paid tier ships (spec §4).

## Assets

| Asset | Size | Source |
|---|---|---|
| Store icon | 128×128 | `icons/icon128.png` |
| Screenshots (3) | 1280×800 | `docs/store/screenshot-1-ready.png`, `screenshot-2-running.png`, `screenshot-3-swept.png` (captured from the demo; the left pane is labelled a stand-in) |
| Small promo tile | 440×280 | `docs/store/promo-small-440x280.png` |
| Opera screenshots (3) | 612×408 | `docs/store/opera/*.png` |
| Edge logo | 300×300 | `docs/store/edge-logo-300.png` |
