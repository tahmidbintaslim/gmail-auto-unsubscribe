# Design

The website's visual system (`web/`). The owner named Momentum (momentumdash.com) as the standard to sit alongside: a bright, airy page, one short headline and one button, the product shown large, colour carried by big panels. This is that pattern in UnsubSweep's own colours, not a copy of Momentum's brand.

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

- Max width 1200px, gutter `clamp(20px, 5vw, 72px)`.
- Home order: hero with the working mini-inbox, one statement, five benefit panels, live demo, Free and Pro, questions, closing band, dark footer.
- One primary action per screen: the dark pill "Get UnsubSweep".
- Every Pro block carries an "In development" badge.

## Components

- **Button:** pill, ink fill; `light` (white) on colour fields; `quiet` (outline).
- **Window (`.win`) and popup (`.popup`):** the product mock, with soft offset shadows. Rows use `is-gone`, `is-now`, `is-skip`.
- **Panel:** 28px radius, text on one side and a product mock on the other; `flip` swaps sides.

## Motion

- The hero inbox runs once by itself after 1.4s, then on the visitor's click.
- Sections below the fold rise in once (GSAP, expo out). Content is visible by default; with reduced motion nothing animates and GSAP is not loaded.
