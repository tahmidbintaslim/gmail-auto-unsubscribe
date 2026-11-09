# UnsubSweep v2 (ext/)

WXT + Preact + TypeScript MV3 extension. Scans Gmail locally, scores senders, lets you review, then unsubscribes.

## Set the OAuth client id
Create a Chrome Extension OAuth client in Google Cloud (consent screen scopes: `gmail.readonly`, `gmail.send`; add your test account as a test user), then:

    WXT_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com npx wxt build

Without it the manifest keeps the placeholder `REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID...` and sign-in fails.

## Build and load
    cd ext && npm install && npx wxt build

Open `chrome://extensions`, enable Developer mode, "Load unpacked", pick `ext/.output/chrome-mv3`. Clicking the toolbar icon opens the side panel.

## Check
    cd ext && npx wxt prepare && npx tsc --noEmit   # typecheck
    npx vitest run                                  # from the repo root

## Owner steps (need a real Google account, not done in CI)
1. Manual real-Gmail test with a test Google account: build with your client id, load unpacked, click "Connect Gmail", scan, unsubscribe from 2 senders, then inspect `chrome.storage.local` key `log` (service worker devtools console: `chrome.storage.local.get("log")`). Record the result in the PR.
2. Record the demo video for Google verification (Task 1) from this build.
