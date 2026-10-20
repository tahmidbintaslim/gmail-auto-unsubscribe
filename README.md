# Gmail Auto Unsubscribe

**Status: prototype.** It is tested against a hand-written copy of Gmail's page, not yet on a live Gmail account. It has no Chrome Web Store listing; you install it with Load unpacked.

A Chrome extension (Manifest V3) for Gmail's Manage subscriptions page. When you press Start, it goes down the list of senders for you. For each one it clicks Unsubscribe and confirms Gmail's dialog, until the list is done or you press Stop.

> **There is no undo and no selection yet.** A run goes through every sender on the page, and the extension cannot re-subscribe you. Only press Start when you want to leave every list shown.

## What it clicks

- It acts only in the tab you opened the popup from, and only after you press **Start**. That tab must be on `mail.google.com` with an address whose `#` part starts with `#sub` (the Manage subscriptions view).
- It clicks each visible **Unsubscribe** button in the sender list, starting from the bottom row. Each sender gets one try per run.
- In the dialog that opens, it clicks **Unsubscribe** when Gmail offers a one-click unsubscribe. Otherwise it clicks **Cancel** and counts the sender as skipped.
- It clicks **Go to website** only if you tick the box in the popup, and then at most 5 times per run. That opens the sender's own site in a new tab, where you finish by hand. The extension then closes the Gmail dialog with Cancel.
- It waits about a second between senders, so a long list takes a few minutes.

The popup shows how many senders were unsubscribed, skipped and sent to a website. Closing the popup does not stop the run; open it again to see the counts.

## When a run stops

- No sender is left that the run has not tried (**Done**).
- You press **Stop**.
- The tab leaves the Manage subscriptions view, for example when you open a message or the inbox.
- 250 senders in one run. Press **Start** again to continue with the rest.
- A Gmail dialog stays open after Unsubscribe. The run stops instead of guessing.
- An unexpected error, or the extension is reloaded or removed.

## What it never does

- It never opens, reads, moves, labels or deletes your email. On the Manage subscriptions page it reads button labels and the text of sender rows, nothing else.
- It never runs on a tab you did not open the popup from, or on any site other than `mail.google.com`.
- It never clicks the Unsubscribe link inside a message. It checks the address before every click and stops once you leave the subscriptions view.
- It never confirms a dialog it did not open. A dialog that is already open when you press Start gets Cancel.
- It never sends data anywhere, stores anything, or loads code from the internet.

## Install (Load unpacked)

1. Download this repository (Code, then Download ZIP) and unzip it, or clone it.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the folder that contains `manifest.json`.
5. Optional: pin the extension from the puzzle-piece menu so its icon stays in the toolbar.

You do not need `npm install` to use the extension; that is only for running the tests.

## Use

1. Open Gmail in Chrome and go to **Manage subscriptions** in the left menu (Gmail may list it under **More**). If your account does not show that page, the extension has nothing to work on.
2. Click the extension icon, then **Start Unsubscribing**.
3. Leave the Gmail tab alone while it runs. Press **Stop** at any time.

The extension matches Gmail's English labels (Unsubscribe, Cancel, Go to website). With Gmail set to another language it finds nothing to click.

## Privacy

Nothing leaves your browser because of this extension:

- No network requests: no `fetch`, XMLHttpRequest, WebSocket or beacon calls, and no analytics.
- No storage: it keeps run counts in memory in the Gmail tab and forgets them when the tab reloads.
- No background service worker, no remote code, no account or server.
- The only messages are between the popup and the Gmail tab, inside Chrome.

`test/manifest.test.js` fails if any file the extension ships gains a network, storage or remote-code call.

What Gmail and senders see is the same as if you clicked yourself: when the extension confirms Unsubscribe, Gmail handles the request to the sender. If you allow Go to website, the sender's site opens in a new tab and sees a normal visit.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Clicking the extension icon gives it temporary access to that one tab. The popup uses it to read the tab's address (to check that it is Gmail's Manage subscriptions view) and to run the clicker there. The access ends when that tab navigates away or closes. |
| `scripting` | Injects `unsubscriber.js` and `content.js` into that Gmail tab when you press Start. Nothing runs in Gmail before that. |

There are no host permissions, no content scripts declared in the manifest, and no `tabs`, `storage` or background permissions, so Chrome shows no site-access warning when you install it.

## Files

- `manifest.json`: permissions and the popup.
- `popup.html`, `popup.js`: Start, Stop and the status line; injects the scripts on Start.
- `unsubscriber.js`: the loop. Finds sender rows and dialogs, clicks, counts and enforces the limits.
- `content.js`: passes Start, Stop and status messages between the popup and the loop.
- `test/`: Vitest and jsdom tests, with the fixtures in `test/fixtures/`.

## Development

Requires Node.js 22 (22.13 or later) or 24.

```bash
npm ci
npm test
```

The tests run the extension's own files in jsdom against `test/fixtures/`, a hand-written, anonymized stand-in for Gmail's Manage subscriptions page and its dialogs. It is not a capture of Gmail, so passing tests do not prove the extension works on the real page. They cover one-click senders, website-only senders, an empty list, the 250-sender cap, lists Gmail re-renders, leaving the page mid-run, Stop, dialogs that do not close, the popup flow with a stubbed `chrome` API, and the manifest's permissions.

## Manual test on real Gmail

Testing on real Gmail is still manual. Use a test account with a few newsletters if you can, and work through this list after any change:

- [ ] Load unpacked shows no errors for the extension on `chrome://extensions`.
- [ ] On a site other than Gmail, Start shows "Open Gmail first."
- [ ] On the Gmail inbox, Start shows "Open Gmail's Manage subscriptions page first."
- [ ] With a one-click sender in the list, Start unsubscribes it, its row leaves the list and the popup count goes up.
- [ ] A sender whose dialog offers only Go to website, with the box unticked: the dialog closes with Cancel, the sender counts as skipped, and its dialog opens only once.
- [ ] The same sender with the box ticked: one new tab opens for it and the Gmail dialog closes. No more than 5 tabs open in one run.
- [ ] Stop during a run: no clicks after the current sender.
- [ ] Opening a message during a run: the run stops with "left the subscriptions page" and nothing in the message is clicked.
- [ ] Closing and reopening the popup during a run: the counts are still shown.
- [ ] An empty list: Start reports Done with zero counts.
- [ ] A long list: senders Gmail loads as you scroll are processed. This is not verified yet; if some are missed, note it and press Start again.
- [ ] Save an anonymized copy of the real page and both dialog types to `test/fixtures/` to replace the hand-written ones.

## Limitations

- English Gmail interface only.
- It depends on Gmail's page markup, which Google can change at any time.
- No preview, selection or keep-list: every sender on the page is processed.
- Not affiliated with or endorsed by Google. Gmail is a trademark of Google LLC.

## License

[MIT](LICENSE)
