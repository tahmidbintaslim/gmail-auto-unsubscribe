# Store submission: UnsubSweep v1

Every store needs its owner to sign in, accept the developer agreement and press Submit, so these steps are done by hand. Listing copy for all stores is in [`store-listing.md`](store-listing.md); images are in [`store/`](store/).

Build both packages first:

```bash
npm run package
```

| Store | Upload | Fee | Dashboard |
|---|---|---|---|
| Chrome Web Store | `dist/unsubsweep-1.0.0.zip` | US$5 once | https://chrome.google.com/webstore/devconsole |
| Microsoft Edge Add-ons | `dist/unsubsweep-1.0.0.zip` | free | https://partner.microsoft.com/dashboard/microsoftedge |
| Opera add-ons | `dist/unsubsweep-1.0.0.zip` | free | https://addons.opera.com/developer/ |
| Firefox Add-ons | `dist/unsubsweep-1.0.0-firefox.zip` | free | https://addons.mozilla.org/developers/ |

## Before any submission

1. Run the extension once on a real Gmail account (Load unpacked, open Manage subscriptions, press Start sweep on an account where losing every subscription is fine). It has only been run on a hand-written copy of the page. A store reviewer will run it on real Gmail.
2. Check that https://unsubsweep.vercel.app/privacy loads. Every store asks for this URL.

## Chrome Web Store

1. Register the developer account, pay the fee, and declare **non-trader** (free, no monetisation).
2. New item → upload the zip.
3. Store listing tab: paste Name, Summary, Detailed description, Category and Language from `store-listing.md`. Upload the three 1280×800 screenshots and `promo-small-440x280.png`.
4. Privacy practices tab: paste the single purpose and the two permission justifications; tick "does not collect user data"; privacy policy URL as above.
5. Distribution: Public, all regions. Submit for review (usually a few days).

## Microsoft Edge Add-ons

Same zip and copy. Edge asks for a 300×300 logo: upload `icons/icon128.png` scaled up, or run `npm run icons` after adding a 300 size. Screenshots 1280×800 are accepted as they are. In "Notes for certification" say: "Open Gmail → Manage subscriptions, click the toolbar icon, press Start sweep. No account or sign-in in the extension."

## Opera add-ons

Same zip and copy. Opera reviews by hand and wants the source to be readable: the zip is unminified, so nothing more is needed. Opera users get it on Gmail in Opera exactly as in Chrome.

## Firefox Add-ons

Not yet run in Firefox: load `dist/unsubsweep-1.0.0-firefox.zip` through `about:debugging` → This Firefox → Load Temporary Add-on and do one run before submitting. The Firefox manifest adds the add-on id and declares that no data is collected. Choose "On this site" distribution; no source upload is needed because nothing is minified.

## After a listing is live

1. Replace the GitHub install link on the site's "Get UnsubSweep" buttons (`web/index.html`, `web/src/partials/header.html`) with the store URL, and update the "Where is the Chrome Web Store link?" answer.
2. Add the site to Google Search Console and submit `https://unsubsweep.vercel.app/sitemap.xml`.
3. Post the launch copy in [`launch.md`](launch.md): Show HN first (weekday morning US time), then X, Reddit, and Product Hunt on a separate day.
