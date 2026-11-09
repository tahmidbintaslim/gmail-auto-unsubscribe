# Chrome Web Store listing: UnsubSweep

Paste these fields into the Chrome Web Store developer dashboard. Package: `npm run package` → `dist/unsubsweep-<version>.zip`.

## Name

`UnsubSweep: Bulk Unsubscribe for Gmail` (same as `manifest.json`)

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

UnsubSweep is not affiliated with or endorsed by Google. Gmail is a trademark of Google LLC.
```

## Privacy practices tab

- **Single purpose:** On Gmail's Manage subscriptions page, clicks Unsubscribe for each sender in turn and confirms Gmail's dialog, after the user presses Start.
- **`activeTab` justification:** Gives the extension access to the Gmail tab the user opened the popup from, only when they open it, so it can check the page is Manage subscriptions and run there. It has no access to any other tab or site.
- **`scripting` justification:** Injects the extension's own two script files (`unsubscriber.js`, `content.js`) into that tab when the user presses Start. No remote code; nothing runs before Start.
- **Remote code:** No, I am not using remote code.
- **Data usage:** I do not collect or use user data. Tick all three certifications.
- **Privacy policy URL:** `https://unsubsweep.com/privacy`

## Account

- Trader status: **non-trader** (free, no monetization). Switch to trader before any paid tier ships (spec §4).

## Assets

| Asset | Size | Source |
|---|---|---|
| Store icon | 128×128 | `icons/icon128.png` |
| Screenshots (3) | 1280×800 | `npm run demo`: start of run, mid-run with dialog, finished "Swept" |
| Small promo tile | 440×280 | mark + "Bulk unsubscribe. Zero access." on `#FFFBF7` |
