# Launch copy: UnsubSweep v1

Post only after the store listing is live and the real-Gmail checklist in the README passes. Replace `<store-url>`.

## Wedge

**Zero access, local-first.** Bulk unsubscribe without giving anyone your inbox.

## Show HN

**Title:** Show HN: UnsubSweep – Bulk unsubscribe in Gmail without giving anyone inbox access

**Body:**

> Gmail added a "Manage subscriptions" page, but no way to unsubscribe from many senders at once: you click Unsubscribe, wait for the dialog, confirm, and repeat for hundreds of senders.
>
> Most tools that do this in bulk want OAuth read access to your whole inbox, and at least one well-known service sold data derived from it.
>
> UnsubSweep is an open-source Manifest V3 extension that does the clicking for you in the Gmail tab you already have open. It asks for two permissions (activeTab, scripting), makes no network requests of its own, stores nothing, and only runs after you press Start on that page. It works one sender at a time, from the bottom of the list up, and stops if you leave the page.
>
> Site: https://unsubsweep.com · Source: https://github.com/tahmidbintaslim/gmail-auto-unsubscribe · Store: <store-url>
>
> I'd love feedback on the approach, and on how it behaves on your Gmail.

## X thread

1. Every bulk-unsubscribe tool wants full read access to your inbox. I built one that wants none. UnsubSweep: free, open source, 100% in your browser. 🧹 [15–20s screen capture of the list clearing]
2. It drives Gmail's own Manage subscriptions page: click, confirm, next. No OAuth, no servers, no data. Two permissions.
3. Free on the Chrome Web Store: <store-url> · Code: github.com/tahmidbintaslim/gmail-auto-unsubscribe

## Product Hunt

- **Tagline:** Bulk unsubscribe from Gmail with zero inbox access
- **Topics:** Productivity, Privacy, Chrome Extensions, Open Source
- **Thumbnail:** animated mark sweeping an envelope (from `brand/mark.svg`)
- **Gallery:** the three store screenshots + the demo GIF
- **Maker comment:** why (inbox-access tools), how (local clicks on Gmail's own page), the promise (the free core stays zero-access; any future paid AI tier is opt-in and still local).

## Reddit

r/gmail and r/privacy: lead with the problem and the how-to, link last, reply to every comment. No cross-posting the same day.
