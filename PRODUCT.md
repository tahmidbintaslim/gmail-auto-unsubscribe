# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyday Gmail users on a desktop Chrome browser, not technical, whose inbox is buried under newsletters and promotions they never chose to keep. They arrive at the website from the Chrome Web Store, a search, or a shared link. Their job on the site is to understand what UnsubSweep does within seconds, believe it is safe, and install the free extension.

Secondary: privacy-minded and technical readers who want to verify the zero-access claim before installing, and people curious about the planned Pro version.

## Product Purpose

UnsubSweep is a free Chrome extension that unsubscribes a person from many Gmail senders in one go. It presses Unsubscribe for each sender on Gmail's own Manage subscriptions page and confirms Gmail's dialog. Success for the website is an install by someone who understood what will happen when they press Start.

## Positioning

It never gets access to the inbox. Other bulk-unsubscribe tools ask to read your mail through Google sign-in and process it on their servers. UnsubSweep has no sign-in, no server and no data collection; it clicks in the Gmail tab the person already has open, using two permissions (`activeTab`, `scripting`).

## Operating Context

- The person opens Gmail's Manage subscriptions page, clicks the extension icon, and presses "Start sweep". The popup shows live counts and ends on "Swept: N unsubscribed, M skipped."
- A live demo runs the extension's real code against a stand-in Gmail page at `/demo/`.
- The website is the home of the privacy policy the Chrome Web Store listing links to (`/privacy`).

## Capabilities and Constraints

- Free version (available now, install from GitHub until the store listing is live): bulk unsubscribe on Gmail's Manage subscriptions page; optional "Go to website" for senders without one-click, at most 5 per run; stops at 250 senders, on Stop, or when the page changes.
- There is no undo and no way to pick senders: a run goes through every sender on the page.
- English Gmail interface only. Not yet verified on a real Gmail account.
- Pro (in development, not released): AI recommendations for senders never opened, sender categories, rules in plain English, newsletter digest. It will use Google sign-in and the Gmail API inside the browser, opt-in. The site must label every Pro mention "In development".
- Later: a local MCP server, a Claude Skill and a Claude Code plugin.
- Not affiliated with Google. "Gmail" may only be used descriptively ("for Gmail").
- Undecided: final domain (`unsubsweep.com` not registered), Chrome Web Store URL, Pro pricing.

## Brand Commitments

- Name: UnsubSweep.
- The owner has said nothing visual is fixed: icon, colors and type may all change. A new icon means regenerating the extension's icons and store assets too.
- Voice: plain, friendly, honest about limits. No hype, no fake urgency.

## Evidence on Hand

- Live demo: `demo/` (real extension code on a stand-in page).
- Screenshots: `docs/store/screenshot-1-ready.png`, `screenshot-2-running.png`, `screenshot-3-swept.png`; demo recording `docs/images/demo-run.gif`.
- Open source repository (MIT), 150+ automated tests.
- There are no users, reviews, testimonials, install counts or press yet. Do not invent any.

## Product Principles

1. Say what it does in one sentence a non-technical person understands.
2. Show it working before asking for an install.
3. Earn trust with specifics (what it reads, what it never does), not adjectives.
4. Be honest about limits: no undo, every sender, English only, Pro not ready.
5. One clear next step on every page.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast at least 4.5:1, full keyboard access with visible focus, reduced-motion respected, no horizontal scroll at 360px.
