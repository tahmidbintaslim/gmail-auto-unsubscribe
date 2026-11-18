# Store submission: UnsubSweep v1

Checked against each store's published rules on 17 November 2026. The source for each rule is linked so you can recheck before submitting, because stores change their rules.

Every store needs you to sign in, accept its developer agreement and press Submit, so these steps are done by hand. The listing copy is in [`store-listing.md`](store-listing.md). Images are in [`store/`](store/) and are rebuilt with `npm run store-assets`.

Build the packages first:

```bash
npm run package
```

| Store | Upload | Fee | Review | Dashboard |
|---|---|---|---|---|
| Chrome Web Store | `dist/unsubsweep-1.0.0.zip` | one-time registration fee (US$5 at last report) | days | https://chrome.google.com/webstore/devconsole |
| Microsoft Edge Add-ons | `dist/unsubsweep-1.0.0.zip` | free | up to 7 business days | https://partner.microsoft.com/dashboard/microsoftedge |
| Opera add-ons | `dist/unsubsweep-1.0.0.zip` | free | manual, often slower | https://addons.opera.com/developer/ |
| Firefox Add-ons | `dist/unsubsweep-1.0.0-firefox.zip` | free | automatic, then manual | https://addons.mozilla.org/developers/ |

## Before any submission

1. **Run it once on a real Gmail account.** Load it unpacked, open Manage subscriptions, and press Start sweep. Use an account where losing every subscription is fine. So far it has only run on a hand-written copy of the page, and reviewers will run it on real Gmail.
2. **Take real screenshots while you do that.** Our current screenshots come from the demo, with the Gmail pane labelled as a stand-in. Chrome's rules ask for screenshots that are accurate and full bleed, so 1280×800 captures of the real Manage subscriptions page with the popup open are safer. Blur or crop out your own email address. Save them over `docs/store/screenshot-*.png`.
3. **Check that https://unsubsweep.vercel.app/privacy loads.** Every store asks for this policy. It names every browser the extension ships to, which Edge requires.
4. **Have a support contact ready.** Edge and Firefox ask for one. The GitHub issues page works; a support email address is better.

## What every store asks about data

The extension reads the Manage subscriptions page, including sender names and email addresses, inside your browser, and never stores or sends them. Chrome and Edge count reading data on your own device as handling user data, so declare it: tick **Website content** and **Personally identifiable information**, and say it is never stored or transmitted. Don't tick "does not collect user data". Exact wording: [`store-listing.md` → Privacy practices](store-listing.md#privacy-practices-tab). Source: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq

## Chrome Web Store

Account (https://developer.chrome.com/docs/webstore/set-up-account):
- Use a Google account with **2-Step Verification** turned on. It's required before you can publish (https://developer.chrome.com/docs/webstore/program-policies/two-step-verification).
- Pay the one-time fee, set a **publisher name**, and add and **verify a contact email**. You can't change the account email later.
- Declare **non-trader**. That's correct while UnsubSweep is free and not run as a business. Switch to trader before any paid Pro version (https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq).

Item:
1. Choose New item and upload the zip.
2. **Store listing** tab:
   - Name, summary, description, category and language come from `store-listing.md`.
   - The name ends "for Gmail™" and the description ends with Google's attribution sentence; both are required by https://developer.chrome.com/docs/webstore/branding.
   - Images: the icon comes from the zip (96px of artwork with 16px of padding), screenshots are 1280×800, and the small promo tile is `promo-small-440x280.png`. The 1400×560 marquee is optional; it's needed only to be featured.
3. **Privacy practices** tab:
   - Single purpose.
   - A justification for each of the two permissions.
   - Remote code: none.
   - Data disclosure as above.
   - Privacy policy URL.
4. **Distribution**: public, all regions. Then submit.

## Microsoft Edge Add-ons

Account (https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account):
- Sign in with a **personal Microsoft account**; work and school accounts aren't accepted.
- Choose **Individual**. The account type and the country can't be changed later.
- The publisher display name can be at most 50 characters.

Item (https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension):
1. Upload the same zip. No changes are needed: we have no `update_url`, and "Chrome" isn't in the name or description.
2. **Availability**: public, all markets.
3. **Properties**:
   - Category: Productivity.
   - Privacy policy URL.
   - Website and support contact are optional but worth filling.
   - Data disclosure as above.
4. **Store listing** (English):
   - Description: the same text; Edge needs at least 250 characters, and ours is well over.
   - Logo: `store/edge-logo-300.png`. Don't upscale `icon128.png`; Edge rejects blurry images.
   - Small promo tile: `promo-small-440x280.png`.
   - Screenshots: the 1280×800 set, up to 6.
   - Search terms: at most 7, each under 30 characters, for example: unsubscribe, gmail, newsletters, email cleanup, inbox, subscriptions, bulk unsubscribe.
5. **Notes for certification**: "To test: sign in to any personal Gmail account that has newsletter subscriptions, open Gmail → Manage subscriptions (left menu, under More), click the toolbar icon and press Start sweep. The extension has no account of its own, so no test login is needed. Every sender on the page will be unsubscribed; use a throwaway Gmail account." Policy 1.3 requires the extension to be testable.

## Opera add-ons

Guidelines: https://help.opera.com/en/extensions/publishing-guidelines/ and https://help.opera.com/en/extensions/acceptance-criteria/

1. Sign in at addons.opera.com/developer with a free Opera account, then upload the same zip. Opera accepts Chromium MV3 packages. Its own MV3 documentation is thin, so if the upload is refused, report it and don't change the package by guesswork.
2. Screenshots: use **`store/opera/*.png` (612×408)**. Opera's limit is 800×600, so the 1280×800 set is too big.
3. Description: paste the full description, not the summary. Opera asks for it to say how to use the extension and what it looks like.
4. The code must be readable, which ours is: no minifying or bundling.

## Firefox Add-ons

Policies: https://extensionworkshop.com/documentation/publish/add-on-policies/ (an update takes effect 1 December 2026; it changes nothing for us).

1. Use a free Mozilla account with **two-factor authentication** turned on, which AMO requires.
2. Before submitting:
   - Install Firefox 140 or newer; the package requires it, because Firefox reads the "collects no data" declaration only from 140.
   - Load `dist/unsubsweep-1.0.0-firefox.zip` through `about:debugging` → This Firefox → Load Temporary Add-on.
   - Do one run on real Gmail. It has never been run in Firefox.
3. Submit:
   - Distribution: **On this site**.
   - Platforms: tick Windows, macOS and Linux only; there's no Android build.
   - Source code: none needed, since nothing is minified or bundled.
4. Listing:
   - Summary: at most 250 characters; ours fits.
   - Up to 2 categories.
   - Support email.
   - Screenshots: 1280×800.
   - The privacy policy field takes pasted text, not a URL. It's optional because nothing leaves the browser; if you fill it in, paste the text of the /privacy page.

## After a listing is live

1. Send the store URL so the site's "Get UnsubSweep" buttons (`web/index.html`, `web/src/partials/header.html`) and the store-link FAQ answer point to it.
2. Add the site to Google Search Console and submit `https://unsubsweep.vercel.app/sitemap.xml`.
3. Post the launch copy in [`launch.md`](launch.md): Show HN first (a weekday morning, US time), then X and Reddit, then Product Hunt on a separate day.
