# Gmail Auto Unsubscribe

A lightweight Chrome Extension (Manifest V3) for bulk-unsubscribing on Gmail's subscriptions page with a simple **Start**/**Stop** popup.

## What this does

- Runs only on `https://mail.google.com/*`
- Clicks visible **Unsubscribe** actions from the bottom of the list upward
- Confirms Gmail unsubscribe dialogs automatically
- Optionally allows **Go to website** actions via popup checkbox
- Lets you stop the process at any time

## Files

- `manifest.json` – extension manifest and Gmail content-script wiring
- `popup.html` – popup UI (Start/Stop + option toggle + status)
- `popup.js` – sends START/STOP commands to the active Gmail tab
- `content.js` – Gmail-side automation loop and dialog handling

## Install in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repository folder
5. Open Gmail subscriptions page: `https://mail.google.com/mail/u/0/#subscriptions`
6. Refresh Gmail once
7. Open the extension popup and click **Start Unsubscribing**

## Privacy-first positioning

This extension is local-first:

- No backend servers
- No API keys
- No inbox export
- No OAuth flow with third-party services

All interaction happens in your browser DOM on Gmail pages.

## Chrome Web Store compliance notes

- Keep permissions minimal and scoped to Gmail
- Maintain clear single-purpose description
- Declare no data collection if behavior remains local-only
- Expect occasional selector updates if Gmail DOM changes
