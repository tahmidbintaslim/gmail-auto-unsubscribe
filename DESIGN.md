# Design

The website's visual system (`web/`). The owner named Momentum (momentumdash.com) as the standard to sit alongside, and Figma community kits (Landify, Iconly, Simple Design System, device mockups) as inspiration: a bright, airy page, one short headline and one button, the product shown large, colour carried by big panels. This is that pattern in UnsubSweep's own colours, not a copy of Momentum's brand.

## Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page ground |
| `--ink` | `#2A1220` | Headings, dark buttons, footer |
| `--text` | `#4A3441` | Body copy |
| `--muted` | `#6E5A66` | Secondary copy |
| `--wash` | `#FFF4EE` | Quiet section ground |
| `--coral` | `#F2542D` | Brand accent as a large fill |
| `--coral-ink` | `#C2360F` | Accent as text or a small fill |
| `--green` | `#0B7A45` | Done, yes |

- A warm glow (peach and amber, blurred) sits behind the top of every page.
- Panels use one saturated field each: sun (coral to magenta), plum, leaf, dusk (indigo), night. White text on a panel must reach 4.5:1 against the lightest stop.

## Type

Figtree Variable, self-hosted. Headings 720–750 weight, tracking -0.025em, balanced. Body 18px/1.6. No eyebrow labels above headings.

## Layout

Follows the reference's structure, in UnsubSweep's own colours, words and pictures.

- Max width 1200px, gutter `clamp(20px, 5vw, 72px)`.
- Header: round logo and three links together on the left, one dark pill on the right.
- Hero: nearly a full screen tall. Headline, one sentence, one dark pill, a small note. On the right, a small "before" list, a hand-drawn arrow, the working list, and the popup floating over its corner.
- Intro: a left-aligned heading and paragraph, then three step cards.
- Scenes: five full-width, full-height colour scenes (dawn, sea, forest, dusk, night), each with soft hills, one large white caption and one product mock. On wide screens each scene sticks and the next slides over it.
- Pricing: centered heading, two cards.
- Demo call-out card: text left, screenshot right.
- Questions in two columns, then a dark footer with a hill line.
- One primary action per screen. Every Pro block carries an "In development" badge.

## Tokens

Radius: `--radius` 28px (panels), `--radius-m` 20px (cards, windows), `--radius-s` 12px (rows). Shadow: `--shadow-1`, `--shadow-2`. Spacing: `--gutter`, `--space-section`. The audit and open follow-ups are in `docs/design/design-system-audit.md`.

## Icons

One family in `web/src/partials/header.html` as an SVG sprite: 24px grid, 1.6px rounded strokes, drawn in the style of Iconly Light. Use `<svg class="icon"><use href="#i-name"/></svg>`.

## Components

- **Button:** pill, ink fill; `light` (white) on colour fields; `quiet` (outline).
- **Window (`.win`) and popup (`.popup`):** the product mock, with soft offset shadows. Rows use `is-gone`, `is-now`, `is-skip`.
- **Laptop frame (`.laptop`):** dark bezel and a base, around a browser bar and a Gmail-like two-column layout.
- **Step card and feature item:** an icon tile, a heading and one line.
- **Scene (`.screen`):** full-width colour field with `--sky`, `--sun` and `--land`; `flip` puts the caption on the right. White text must reach 4.5:1 on the sky.

## Motion

- The hero inbox runs once by itself after 1.4s, then on the visitor's click.
- Scenes stack as you scroll: the one underneath eases back while the next slides over. Step and plan cards rise in once (GSAP, expo out). Content is visible by default; with reduced motion nothing animates and GSAP is not loaded.
