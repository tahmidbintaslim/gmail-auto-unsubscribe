# UnsubSweep Brand Guidelines

## What the brand stands for

UnsubSweep gets you out of every newsletter in Gmail with one click, and it never gets access to your inbox. The brand is plain, friendly and honest about limits.

## Voice

| We are | We are not | Example |
|---|---|---|
| Plain | Technical | "It never reads your email", not "zero OAuth scopes" |
| Friendly | Cute | "Watch the list clear", not "Bye-bye, spam!" |
| Honest | Salesy | "There's no undo", stated next to the main claim |
| Brief | Wordy | One sentence under each heading |

Rules:
- Say what happens when you press the button.
- Name the limits where the claim is made: no undo, every sender, English only, Pro not out yet.
- Never invent proof. There are no users, ratings or reviews yet.
- "Gmail" is only used descriptively ("for Gmail"). Never imply Google endorses the product.

## Words

| Use | Avoid |
|---|---|
| Unsubscribe, sweep | Purge, nuke, kill |
| Sender | Subscription source, list owner |
| Manage subscriptions (Gmail's name for its page) | Subscription manager |
| Install free | Download now, Get started |
| In development (for Pro) | Coming soon!, Beta |

## Colour

| Name | Hex | Use |
|---|---|---|
| Ink | `#2A1220` | Headings, dark buttons, footer |
| Text | `#4A3441` | Body copy |
| Coral | `#F2542D` | Brand accent as a large fill; the icon's colour |
| Coral ink | `#C2360F` | Accent as text or a small fill |
| Wash | `#FFF4EE` | Quiet backgrounds |
| Green | `#0B7A45` | Done, yes |
| White | `#FFFFFF` | Page ground |

Panel fields: sun (coral to magenta), plum, night. White text must reach 4.5:1 on the lightest part of a field.

## Type

Figtree Variable, self-hosted. Headings 720–750 weight, tight tracking. Body 18px with 1.6 line height.

## Logo and icon

- The mark is Lucide's broom sweeping Lucide's mail icon, white on a coral (`#F2542D`) rounded square: `brand/mark.svg`.
- Lockups: `brand/logo.svg` (ink wordmark, light backgrounds) and `brand/logo-dark.svg` (white wordmark, dark backgrounds and photos). The wordmark is outlined Figtree Bold, so the files need no font.
- Keep clear space of a quarter of the mark's width on every side.
- Minimum size 16px. Don't recolour, rotate or crop the tile into a circle.
- The wordmark is "UnsubSweep", one word, capital U and S.
- The extension icons and store images are generated from these files: `npm run icons`, then `npm run store-assets`.
- Figma: [UnsubSweep Brand](https://www.figma.com/design/7QB9fAbGDQAbgUtEZ9jtc8) has the brand board, logo and icon components, colour variables and Figtree text styles. The SVGs in `brand/` stay the source of truth for code.

## Icons

[Lucide](https://lucide.dev) (ISC licence): 24px grid, 2px rounded strokes, no fills. The site keeps them in one SVG sprite in `web/src/partials/header.html`; add an icon by copying its paths from Lucide into a new `<symbol id="i-name">`. Inline icons are 18px and take the text colour; step icons sit in an ink tile.

## Imagery

Show the product, not stock photos: the pretend Gmail list inside a laptop frame, the popup, Gmail's dialog. Label every pretend screen as pretend.
