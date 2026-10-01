# Privacy Policy for UnsubLocal

**Effective Date:** October 1, 2026  
**Last Updated:** October 1, 2026

This Privacy Policy describes how **UnsubLocal** ("the Extension", "we", "us", or "our") handles user information when you use the Chrome extension. We maintain an uncompromising commitment to user privacy: **UnsubLocal operates entirely locally on your machine and collects, stores, transmits, or sells zero user data.**

---

## 1. Single Purpose & Core Operation

UnsubLocal is designed with a single purpose: to automate user interactions within Gmail's native "Manage Subscriptions" interface (`#subscriptions`) by programmatically confirming unsubscribe prompts and handling sender website redirects.

The extension runs entirely client-side within your browser session using standard DOM automation scripts. It does not communicate with external servers, cloud databases, or third-party analytical endpoints.

---

## 2. Information We Do Not Collect

UnsubLocal does **not** collect, inspect, process, or store:
- **Personal Information:** Names, email addresses, phone numbers, IP addresses, or Google account credentials.
- **Email Content:** Email bodies, message text, subject lines, attachments, drafts, or sender histories.
- **Browsing & Activity Data:** Browsing history, search queries, session analytics, telemetry, or clicks outside the native Gmail subscriptions UI.
- **Financial & Payment Data:** The extension contains no payment processing or billing tracking mechanisms.

---

## 3. Extension Permissions & Justifications

To function properly, UnsubLocal requests the minimum required permissions under the principle of least privilege:

| Permission | Justification |
| :--- | :--- |
| `https://mail.google.com/*` | Required solely to run client-side automation scripts on Gmail's subscription management page. This allows the script to click user-facing "Unsubscribe" buttons and confirm Material modal dialogs. |
| `activeTab` / Action Popup | Used to detect whether the user is actively on Gmail and pass the "Start" and "Stop" commands from the extension popup interface. |

The extension **never** accesses, monitors, or runs on any website outside `mail.google.com`.

---

## 4. Third-Party Sharing & Data Transfers

Because UnsubLocal does not gather or store any data:
- **No Data Transfers:** No data is ever transmitted off your device or sent to any remote server.
- **No Third-Party Brokers:** We do not sell, rent, license, or monetize user data under any circumstances.
- **No Tracking Scripts:** The extension contains zero trackers, third-party analytics libraries (such as Google Analytics or Mixpanel), or ad network SDKs.

---

## 5. Google API Services User Data Policy Compliance

UnsubLocal's use and transfer of information received from Google APIs adheres to the [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/), including the **Limited Use** requirements:

1. **Client-Side Confined:** All operations occur within the local browser runtime.
2. **No Secondary Use:** User data is never used for serving advertisements, credit determinations, model training, or market research.
3. **No Human Interaction:** No humans have access to your inbox or Gmail interface through this extension.

---

## 6. Data Security & Storage

- **Local Execution:** All script logic executes within the isolated sandbox environment provided by Google Chrome's Manifest V3 architecture.
- **Zero Local Footprint:** The extension does not write logs, email identifiers, or interaction histories to browser storage (`chrome.storage.local`), `localStorage`, or IndexedDB.

---

## 7. Changes to This Privacy Policy

Because the extension collects no data, changes to this policy will be infrequent. If we update our practices or if updates are required by Chrome Web Store Developer Program Policies, we will update the "Last Updated" date at the top of this document.

---

## 8. Contact & Developer Information

If you have questions, feedback, or concerns regarding this Privacy Policy or the security of UnsubLocal, please open an issue on our GitHub repository or contact the developer:

- **Developer / Maintainer:** [Your Name or Brand Name]
- **Email:** [your-developer-email@example.com]
- **GitHub Repository:** [https://github.com/your-username/unsublocal]
