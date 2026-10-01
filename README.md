# UnsubLocal: Bulk Unsubscribe for Gmail

A lightweight Chrome Extension (Manifest V3) that bulk-unsubscribes Gmail senders from Gmail's native subscriptions page with a simple **Start**/**Stop** popup.

## What this does

- Runs only on Gmail subscription routes (`#sub...`)
- Clicks visible **Unsubscribe** actions from the bottom of the list upward
- Confirms Gmail unsubscribe dialogs automatically
- Optionally handles **Go to website** prompts
- Lets you stop the process at any time

## Privacy-first positioning

UnsubLocal is local-first:

- No backend servers
- No API keys
- No inbox export
- No OAuth flow with third-party services
- No data collection or tracking

All interaction happens in your browser DOM on Gmail pages.

## Files

- `manifest.json` – extension manifest and Gmail content-script wiring
- `popup.html` – popup UI (Start/Stop + status)
- `popup.js` – sends START/STOP commands to the active Gmail tab
- `content.js` – Gmail-side automation loop and dialog handling
- `PRIVACY_POLICY.md` – Chrome Web Store privacy policy text
- `WEBSTORE_LISTING.md` – ready-to-paste Store Listing and reviewer responses

## Install in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repository folder
5. Open Gmail subscriptions page: `https://mail.google.com/mail/u/0/#subscriptions`
6. Refresh Gmail once
7. Open the extension popup and click **Start Unsubscribing**

## Package for Chrome Web Store

1. Ensure `icon16.png`, `icon48.png`, `icon128.png` are present.
2. Select extension files (`manifest.json` at root level) and create `extension.zip`.
3. Upload ZIP in Chrome Developer Dashboard.

## Chrome Web Store compliance notes

- Keep permissions minimal and scoped to Gmail
- Maintain clear single-purpose description
- Declare no data collection while behavior remains local-only
- Expect occasional selector updates if Gmail DOM changes
