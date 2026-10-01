# UnsubLocal Chrome Web Store Listing Content

## Short Summary

Bulk unsubscribe from newsletters in Gmail automatically—100% locally in your browser with zero inbox access or tracking.

## Detailed Store Description

Stop giving third-party services full read-access to your private email inbox just to clean up promotional newsletters.

UnsubLocal automates Gmail’s native subscription manager directly inside your browser—with zero external servers, zero API tokens, and zero data tracking.

Traditional email-cleaning apps require full OAuth/IMAP access, meaning external servers read your emails, harvest metadata, or charge expensive recurring subscriptions. UnsubLocal works entirely on the client side by automating the manual clicks you would normally have to make inside Gmail's built-in "Manage subscriptions" page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 100% Private & Local: Runs entirely in your browser. No data ever leaves your computer.
• Automated Modal Confirmation: Automatically detects and confirms Gmail's secondary "Unsubscribe" popups and handles "Go to website" prompts.
• Intelligent DOM Handling: Intercepts row-level search links to prevent accidental page redirects while unsubscribing.
• Safe Sequential Execution: Cleans your subscriptions sequentially to ensure Gmail registers every unsubscribe request with the sender.
• Pause & Resume: Start or stop the cleanup at any moment with a single click.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO USE IT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open Gmail on your computer.
2. In the left sidebar, click "More", then select "Manage subscriptions" (or navigate to https://mail.google.com/mail/u/0/#subscriptions).
3. Click the UnsubLocal extension icon in your Chrome toolbar.
4. (Optional) Choose whether to automatically open sender websites for services that do not support one-click email unsubscribing.
5. Click "Start Unsubscribing" and let the extension clear your list.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIVACY & PERMISSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UnsubLocal adheres to the principle of least privilege:
• Works only on mail.google.com: The extension has no access to any other website you visit.
• No Inbox Reading: The script interacts strictly with UI buttons on the subscription dashboard. It cannot read, alter, or send emails on your behalf.
• Zero Data Collection: We do not track analytics, store cookies, or operate any remote tracking servers.

## Privacy Practices & Reviewer Justifications

### 1) Single Purpose Description

Automates client-side interaction with Gmail's native subscription management interface to bulk-confirm unsubscribe dialogs.

### 2) Host Permission Justification (`https://mail.google.com/*`)

The extension requires access to `https://mail.google.com/*` exclusively to automate user interactions on Gmail's native "Manage Subscriptions" page (`#subscriptions`).
Specifically, the content script identifies the user-facing "Unsubscribe" buttons and confirms the subsequent Material modal dialogs (`Unsubscribe` and `Go to website`).
This permission is strictly restricted to DOM automation on the active page. The extension does NOT read email message contents, headers, contacts, or user metadata, and transmits zero data over the network.

### 3) Data Usage Declarations

- **User Data:** Select **"I do not collect or use user data."**
- **Certifications:** Check all compliance boxes:
  - The extension adheres to the Limited Use policy.
  - The extension is not used for crypto-mining, deceptive practices, or distributing malware.
  - Data practices comply with Developer Program Policies.
