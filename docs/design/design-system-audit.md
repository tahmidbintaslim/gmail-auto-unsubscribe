# Design System Audit: Website (`web/src/style.css`)

**Components reviewed:** 14 · **Issues found:** 6 · **Score:** 78/100

## Token coverage

| Category | Tokens | Hardcoded values still in the CSS |
|---|---|---|
| Colour | 9 (`--ink`, `--text`, `--muted`, `--line`, `--wash`, `--coral`, `--coral-ink`, `--amber`, `--green`) | Panel gradient stops; mock-only tints (`#EEF8F2`, `#FFF1EA`, `#F4EDF0`, `#FFE9DF`) |
| Radius | 3 (`--radius`, `--radius-m`, `--radius-s`) | Buttons use `999px`; a few `10–16px` values on small controls |
| Shadow | 2 (`--shadow-1`, `--shadow-2`) | Popup and card shadows are written out |
| Spacing | 2 (`--gutter`, `--space-section`) | Component padding is written per component |
| Type | 1 family token | Sizes are written per element with `clamp()` |
| Motion | 1 (`--ease`) | Durations are written per use |

## Component completeness

| Component | States | Variants | Documented | Score |
|---|---|---|---|---|
| Button | default, hover, focus | dark, light, quiet | Yes | 9/10 |
| Badge | default | on white, on panel | Yes | 8/10 |
| Window and rows | default, is-gone, is-now, is-skip | hero, panel | Yes | 9/10 |
| Popup | start: default, hover, disabled | hero, panel | Yes | 8/10 |
| Laptop frame | n/a | one | Yes | 8/10 |
| Step card | default | one | Yes | 8/10 |
| Feature item | default | one | Yes | 8/10 |
| Panel | default | sun, plum, night, flip | Yes | 9/10 |
| Plan card | default | free, pro | Partly | 7/10 |
| FAQ item | default | one | Partly | 7/10 |
| Header nav | default, hover, current | wide, narrow | Partly | 7/10 |
| Footer | default, hover | one | Partly | 7/10 |
| Docs layout | default | one | No | 6/10 |
| Icon | n/a | 12 symbols | Yes | 9/10 |

## Naming

| Issue | Where | Recommendation |
|---|---|---|
| `.stop` is used for both "Stop" and "Reset" in the popup mock | `.popup .stop` | Rename to `.secondary` |
| `.show` (panel media) is vague | `.panel .show` | Rename to `.panel-media` |
| Mock tints have no names | rows, pills | Add `--tint-done`, `--tint-now`, `--tint-neutral` |

## Priority actions

1. Name the four mock tints as tokens so the hero, panels and popup can't drift apart.
2. Add a type scale (`--step-0` to `--step-5`) and use it for headings.
3. Move the popup and card shadows onto `--shadow-1` / `--shadow-2`.

These are follow-ups; none blocks the current release.
