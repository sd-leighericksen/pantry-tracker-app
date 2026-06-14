---
version: 1.0
name: pantry-tracker-design
description: |
  Project-specific design guide for the Pantry Tracker household app.
  A clean, photo-led, dark-default product UI tuned for three surfaces:
  a kitchen kiosk (wall-mounted touchscreen + USB barcode scanner),
  mobile (one-handed shopping list and photo capture), and desktop
  (admin and reports). Built on Next.js App Router + Tailwind v4 + GSAP,
  using Geist (sans display + body) and Geist Mono (codes, quantities,
  expiries) with a single emerald accent and a separate five-step
  Nutri-Score scale reserved for nutritional data.

colors:
  # Surface
  canvas: "#000000"
  surface-card: "#0a0a0c"
  surface-elevated: "#101012"
  surface-deep: "#06060a"
  surface-light: "#f1f7fe"

  # Hairlines (translucent white, no drop shadows on dark surfaces)
  hairline: "rgba(255,255,255,0.06)"
  hairline-strong: "rgba(255,255,255,0.14)"
  divider-soft: "rgba(255,255,255,0.04)"

  # Text on dark
  ink: "#fcfdff"
  body: "rgba(252,253,255,0.86)"
  charcoal: "rgba(252,253,255,0.7)"
  mute: "#a1a4a5"
  ash: "#888e90"
  stone: "#464a4d"

  # Text on light (desktop reports light theme, AI-photo capture sheet)
  on-light: "#0a0a0c"
  on-light-mute: "rgba(10,10,12,0.7)"

  # Brand accent — one only, used as the system anchor
  accent: "#11ff99"
  accent-glow: "rgba(34,255,153,0.18)"
  accent-on: "#000000"

  # Semantic — feedback colours, not decorative
  success: "#11ff99"
  warning: "#ffc53d"
  danger: "#ff2047"
  danger-glow: "rgba(255,32,71,0.34)"
  link: "#3b9eff"

  # Nutri-Score — functional five-step scale, NEVER reused for branding
  nutri-a: "#1f8a3a"
  nutri-b: "#7cc242"
  nutri-c: "#ffc53d"
  nutri-d: "#f59332"
  nutri-e: "#e53935"

typography:
  display-xxl:
    fontFamily: Geist
    fontSize: 80px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: -2.4px
  display-xl:
    fontFamily: Geist
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -1.6px
  display-lg:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -1.2px
  heading-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.4px
  heading-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.3px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  button-md:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -0.2px
  button-kiosk:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: -0.3px
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  code-md:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
  qty-ticker:
    fontFamily: Geist Mono
    fontSize: 64px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -2px
    fontFeature: "tnum"
  qty-card:
    fontFamily: Geist Mono
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.0
    fontFeature: "tnum"
  barcode-mono:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  "2xl": 24px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  xxxl: 48px
  section: 96px

# Tap targets — kiosk is a hard rule from the brief
target:
  kiosk-min: 56px
  kiosk-arm: 96px
  mobile-min: 48px
  desktop-min: 36px

motion:
  fast: 120ms
  base: 200ms
  slow: 360ms
  easing-standard: "cubic-bezier(0.2, 0.8, 0.2, 1)"
  easing-emphasised: "cubic-bezier(0.2, 0.0, 0.0, 1)"

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
  button-primary-kiosk:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    typography: "{typography.button-kiosk}"
    rounded: "{rounded.lg}"
    padding: 16px 28px
    height: 56px
  button-ghost:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
    border: "1px solid {colors.hairline-strong}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: 9px 17px
    height: 40px
    border: "1px solid {colors.hairline-strong}"
  text-input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 14px
    height: 44px
    border: "1px solid {colors.hairline-strong}"
  scan-mode-toggle:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.button-kiosk}"
    rounded: "{rounded.xl}"
    padding: 24px 32px
    height: 96px
    border: "1px solid {colors.hairline-strong}"
  scan-mode-toggle-armed-in:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    typography: "{typography.button-kiosk}"
    rounded: "{rounded.xl}"
    padding: 24px 32px
    height: 96px
  scan-mode-toggle-armed-out:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.ink}"
    typography: "{typography.button-kiosk}"
    rounded: "{rounded.xl}"
    padding: 24px 32px
    height: 96px
  scan-toast-card:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.heading-md}"
    rounded: "{rounded.xl}"
    padding: 24px
    border: "1px solid {colors.hairline-strong}"
  product-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px
    border: "1px solid {colors.hairline}"
  product-card-low-stock:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px
    border: "1px solid {colors.danger}"
  quick-add-tile:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.lg}"
    padding: 16px
    height: 144px
    border: "1px solid {colors.hairline-strong}"
  shopping-row:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 16px
    height: 64px
    border: "1px solid {colors.hairline}"
  shopping-row-ticked:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 16px
    height: 64px
    border: "1px solid {colors.divider-soft}"
  store-section-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.heading-sm}"
    rounded: "{rounded.none}"
    padding: 16px 0 8px 0
  qty-stepper:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.qty-card}"
    rounded: "{rounded.lg}"
    padding: 8px
    height: 56px
    border: "1px solid {colors.hairline-strong}"
  badge-pill:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.body}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
    border: "1px solid {colors.hairline}"
  badge-store:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  badge-nutri:
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: 2px 10px
    height: 24px
  badge-expiring:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-light}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  badge-expired:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  kiosk-nav-tab:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.charcoal}"
    typography: "{typography.button-kiosk}"
    rounded: "{rounded.lg}"
    padding: 16px 24px
    height: 64px
  kiosk-nav-tab-active:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    typography: "{typography.button-kiosk}"
    rounded: "{rounded.lg}"
    padding: 16px 24px
    height: 64px
    border: "1px solid {colors.hairline-strong}"
  mobile-fab:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    rounded: "{rounded.full}"
    size: 64px
  status-dot:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    size: 8px
---

## Design read

**Reading this as:** a household kitchen inventory product (kiosk-first, mobile-companion, desktop-admin), with a clean, calm, photo-led dark language, leaning toward Tailwind v4 + Geist + GSAP feedback motion on Next.js App Router.

The audience is one Australian household using three very different devices:
- A **kitchen kiosk** — wall-mounted touchscreen with a USB barcode scanner. Lives in dark mode 16 hours a day under glare. Input is a finger or a scanner gun. Hover does not exist.
- A **mobile phone** — used in supermarket aisles, often one-handed, often with cold or wet fingers, always against direct overhead light.
- A **desktop** — the rare admin sit-down for settings, reports, store and category management.

This is not a landing page, not a portfolio, not a dashboard. It is a **household product UI** that has to feel as quick and as pleasant as a polished consumer app to survive past week two.

### Dial calibration (per `design-taste-frontend` §1)

- **`DESIGN_VARIANCE: 5`** — calm and predictable. Scanning is rote; layouts must not surprise. Variance lives in product photography and animation timing, not grid weirdness.
- **`MOTION_INTENSITY: 5`** — GSAP confirms and rewards. Animations are feedback, not decoration; they must never block the next scan and must respect `prefers-reduced-motion`.
- **`VISUAL_DENSITY: 3`** — photo-led, generously spaced on kiosk and mobile. Desktop reports lean ~5/10 (denser tables, smaller chrome) but never feel admin-y.

### Anti-default discipline for this project (per `design-taste-frontend` §0.D, §4)

- **No editorial display serif.** No Fraunces, no Instrument Serif, no Domaine Display. This is a household kitchen app, not a magazine. Display type is **Geist**, weight 600, tight tracking.
- **No AI-purple / no warm-beige premium-consumer palette.** The canvas is pure `{colors.canvas}` (`#000000`), the accent is a single saturated green `{colors.accent}`, and warmth lives in product photos, not surfaces.
- **No drop shadows.** Elevation is built from translucent-white hairlines (`{colors.hairline}` 6%, `{colors.hairline-strong}` 14%) and one atmospheric glow per section maximum.
- **One accent locked across the page** (`{colors.accent}`). Nutri-Score colours `{colors.nutri-a}`–`{colors.nutri-e}` exist only on Nutri-Score badges and the pantry-health visual. They never appear as CTAs, links, or surfaces.
- **No emoji as system glyphs.** Quick-add tiles may use user-chosen emojis (the household setting them, not us — this is their choice). System icons use one Phosphor stroke-1.5 family across the entire app.

---

## Surfaces

Three surfaces, one token system. Density and target sizes shift between them; type ramp and colour do not.

| Surface | Width band | Primary use | Tap target floor | Default theme |
|---|---|---|---|---|
| **Kiosk** | 1080–1920px touchscreen, fixed | Scan in/out, Quick Use, quick-add, browse inventory | `{target.kiosk-min}` (56px) standard; `{target.kiosk-arm}` (96px) for scan-mode toggles | dark only |
| **Mobile** | ≤ 767px | Shopping list grouped by store, AI photo capture, low-stock check | `{target.mobile-min}` (48px) | dark default; light optional |
| **Desktop** | ≥ 1024px | Settings, reports, category/store/item admin, data cleanup | `{target.desktop-min}` (36px) | dark default; light optional |

Tablet (768–1023px) renders mobile layouts at a wider container — no separate breakpoint design. The kiosk is a fixed-aspect device, not a generic tablet.

---

## Colour

### Surface
- **Canvas** (`{colors.canvas}` — `#000000`) — every page. Pure black, never near-black.
- **Surface Card** (`{colors.surface-card}` — `#0a0a0c`) — inventory cards, shopping rows, inputs, text inputs.
- **Surface Elevated** (`{colors.surface-elevated}` — `#101012`) — scan-toast cards, ghost buttons, active kiosk nav tabs, quick-add tiles, qty steppers, badge pills. The "lifted" layer.
- **Surface Deep** (`{colors.surface-deep}` — `#06060a`) — code wells in dev/diagnostics views (settings → debug). Rare in user-facing surfaces.
- **Surface Light** (`{colors.surface-light}` — `#f1f7fe`) — pressed state of `{components.button-primary}` and the rare light-on-dark inset (e.g. AI photo-capture confirmation sheet on mobile).

### Hairlines (no drop shadows on this canvas)
- **Hairline** (`{colors.hairline}` — `rgba(255,255,255,0.06)`) — soft separators between list rows and around quiet product cards.
- **Hairline Strong** (`{colors.hairline-strong}` — `rgba(255,255,255,0.14)`) — the structural 1px border on scan-mode toggles, scan-toast cards, quick-add tiles, inputs, ghost/outline buttons.
- **Divider Soft** (`{colors.divider-soft}` — `rgba(255,255,255,0.04)`) — between settings sections, between ticked and unticked shopping items.

### Text
- **Ink** (`{colors.ink}` — `#fcfdff`) — primary text on dark. Faintly cool to read like paper.
- **Body** (`{colors.body}` — 86% white) — long body copy where pure ink reads too sharp (settings, reports prose).
- **Charcoal** (`{colors.charcoal}` — 70%) — captions, inactive nav, metadata.
- **Mute / Ash / Stone** — declining tertiary text for footer-style chrome, disabled foreground.
- **On-Light** (`{colors.on-light}`) and **On-Light Mute** — only on the rare light surfaces (button-primary pressed, AI photo confirm sheet, light-theme desktop reports if enabled).

### Brand accent — `{colors.accent}` (`#11ff99`)
A single saturated emerald-green. Reserved for:
- `{components.button-primary}` (kiosk + mobile + desktop CTAs)
- The **Scan In** toggle when armed (`{components.scan-mode-toggle-armed-in}`)
- The kiosk **scan-success flash** glow ring (`{colors.accent-glow}`)
- The **mobile FAB** ("+ add to list", "+ scan photo")
- The footer/system **status dot** ("Connected", "Synced")

One accent per page. Never apply `{colors.accent}` to chrome, borders, body text, or links. Never run it as a gradient background — only as a flat fill or a single low-opacity atmospheric glow.

### Semantic
- **Warning** (`{colors.warning}` — `#ffc53d`) — "expiring soon" badge fill, gentle warnings.
- **Danger** (`{colors.danger}` — `#ff2047`) — "expired" badge, "Scan Out" armed state, destructive confirmations, error toasts. Used sparingly; do not paint whole surfaces danger-red.
- **Link** (`{colors.link}` — `#3b9eff`) — inline links in body copy. The only blue in the system.

### Nutri-Score scale
A separate **five-step functional scale**, `{colors.nutri-a}` → `{colors.nutri-e}`. Used **only** inside `{components.badge-nutri}` and the "health of our pantry" summary visual (`/components/PantryHealth`). Never appears as a CTA, link, or page surface. The yellow `{colors.nutri-c}` shares a hue with `{colors.warning}` but they are not interchangeable tokens — keep them semantically separate.

---

## Typography

### Font family

Two families, both already permissively licensed:

- **Geist** — sans display and body, weight 400/500/600. Loaded via `next/font/local` (Geist) or `next/font/google` if the project prefers the variable cut. Display sizes run at weight 600 with tight negative tracking; body stays at 400. **No italic in display headlines** unless it earns it — match the skill's "italic in same family only" emphasis rule.
- **Geist Mono** — tabular figures for **all quantities, barcodes, EAN strings, expiry dates, and code wells**. Always with `font-feature-settings: "tnum"` so quantity tickers animate without column jitter.

That is the entire type stack. Do not introduce a third family. Do not bring in Inter, Fraunces, Instrument Serif, Domaine, or Söhne — see `design-taste-frontend` §4.1 SERIF DISCIPLINE.

### Hierarchy

| Token | Size | Weight | Family | Use |
|---|---|---|---|---|
| `{typography.display-xxl}` | 80px | 600 | Geist | Kiosk home idle screen ("Hi") — one per page maximum. |
| `{typography.display-xl}` | 56px | 600 | Geist | Section openers on desktop (Reports, Settings). |
| `{typography.display-lg}` | 40px | 600 | Geist | Mobile shopping list page heading; kiosk view titles. |
| `{typography.heading-md}` | 24px | 500 | Geist | Card titles (product card name on kiosk, shop-section header on mobile). |
| `{typography.heading-sm}` | 20px | 500 | Geist | Inventory list headers, settings subsection titles, store-section labels. |
| `{typography.body-lg}` | 18px | 400 | Geist | Shopping-row item text, kiosk product card subtitle. |
| `{typography.body-md}` | 16px | 400 | Geist | Default body. Inventory list rows, settings copy. |
| `{typography.body-sm}` | 14px | 400 | Geist | Captions, metadata (last bought, average interval). |
| `{typography.button-md}` | 15px | 500 | Geist | Default button label. |
| `{typography.button-kiosk}` | 20px | 600 | Geist | Scan-mode toggle labels, kiosk nav tabs, kiosk CTAs. |
| `{typography.caption}` | 12px | 400 | Geist | Pill labels, footer disclosure, metadata under cards. |
| `{typography.code-md}` | 13px | 400 | Geist Mono | Debug surfaces only. |
| `{typography.qty-ticker}` | 64px | 500 | Geist Mono | Scan-toast quantity ticker (animates with `tnum`). |
| `{typography.qty-card}` | 28px | 500 | Geist Mono | Quantity on inventory product cards, qty stepper number. |
| `{typography.barcode-mono}` | 13px | 400 | Geist Mono | Raw EAN/UPC strings in item detail and debug. |

### Principles

- Display sizes always run `lineHeight: 1.0` with negative tracking. They stack as solid blocks, not open prose.
- Body weight stays at 400. Hierarchy comes from size and family (Geist Mono for numbers), not from bumping body to 600.
- All numbers — quantities, barcodes, expiry days, last-bought intervals, prices in reports — render in **Geist Mono with `tnum`**. This is the single rule that keeps the quantity ticker from jittering during scan animations.
- Australian English in every visible string and copy comment (`colour`, `organise`, `tinned`, `mince`, `chemist`, `Woolies`/`Coles`/`ALDI`). Do not pluralise brand names.

---

## Layout

### Spacing system
Base unit 4px. Tokens: `{spacing.xxs}` 2 · `{spacing.xs}` 4 · `{spacing.sm}` 8 · `{spacing.md}` 12 · `{spacing.lg}` 16 · `{spacing.xl}` 24 · `{spacing.xxl}` 32 · `{spacing.xxxl}` 48 · `{spacing.section}` 96.

- Card internal padding: `{spacing.lg}` (16px) on `{components.product-card}` and `{components.shopping-row}`; `{spacing.xl}` (24px) on `{components.scan-toast-card}`; `{spacing.xxl}` (32px) on desktop settings panels.
- Kiosk container: `{spacing.xxl}` (32px) horizontal padding, `{spacing.xl}` (24px) vertical between bands.
- Mobile container: `{spacing.lg}` (16px) horizontal, `{spacing.lg}` (16px) between shopping rows, `{spacing.xl}` (24px) between store sections.
- Desktop content max-width 1200px. Reports go to 1400px when tables demand it.

### Grids

- **Kiosk inventory grid:** 4 columns at 1920px, 3 at 1600px, never fewer than 3 on the touchscreen target. Photo-led tiles ~280–360px wide. Use CSS Grid (`grid grid-cols-3 xl:grid-cols-4 gap-6`), never flex with calc math.
- **Kiosk Quick Use / quick-add tile grid:** 5 columns at 1920px, 4 at 1600px. Tiles square, photo-led, `{components.quick-add-tile}` height fixed at 144px.
- **Mobile shopping list:** single column, grouped by store with `{components.store-section-header}` between groups. Items run full container width, 64px row height.
- **Desktop inventory table:** allowed only on desktop reports/admin. Sticky header, hairline row separators, Geist Mono numeric columns. Never appears on kiosk or mobile.

### Viewport stability
- Never use `h-screen` for the kiosk shell or any mobile route. Always `min-h-[100dvh]` to survive iOS Safari chrome shifts (mobile) and on-screen keyboard appearance (kiosk Quick Use search).
- Kiosk is a fixed device — design at 1920×1080 and confirm at 1366×768. No mobile-style portrait kiosk layout in v1.

### Whitespace philosophy
- The kiosk reads at arm's length. Bigger air around scan feedback than feels right on a laptop preview — confirm physically on the touchscreen before shipping.
- Hairlines do the job that drop shadows do in a brighter system. Do not introduce shadows to add hierarchy.

---

## Elevation & depth

| Level | Treatment | Use |
|---|---|---|
| 0 — flat | No border | `{colors.canvas}` page bands, kiosk shell background. |
| 1 — card | `{colors.surface-card}` + 1px `{colors.hairline}` | Product cards, shopping rows, default surfaces. |
| 2 — elevated | `{colors.surface-elevated}` + 1px `{colors.hairline-strong}` | Scan-toast card, quick-add tile, qty stepper, ghost button, active kiosk nav tab. |
| 3 — deep | `{colors.surface-deep}` + 1px `{colors.hairline-strong}` | Debug/code wells (settings → debug). Rare. |
| 4 — atmospheric | Single low-opacity radial wash (`{colors.accent-glow}` or `{colors.danger-glow}`) | Scan-success ring around toast card; armed-mode under-glow behind the active scan toggle. |

No drop shadows on dark surfaces. The single accent glow is the only ambient depth cue.

---

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-bleed bands, kiosk top bar, table headers. |
| `{rounded.xs}` | 4px | Inline tags inside debug wells. |
| `{rounded.sm}` | 6px | Sub-pills, small chips. |
| `{rounded.md}` | 8px | Buttons (default, ghost, outline), inputs, qty stepper buttons. |
| `{rounded.lg}` | 12px | Product cards, shopping rows, quick-add tiles, kiosk nav tabs, qty stepper container. |
| `{rounded.xl}` | 16px | Scan-mode toggles, scan-toast card. |
| `{rounded.2xl}` | 24px | Mobile bottom sheets (photo capture, item detail). |
| `{rounded.full}` | 9999px | Pills, status dots, store badges, Nutri-Score badge, mobile FAB, contributor-style avatars. |

---

## Iconography

- **Family:** `@phosphor-icons/react`, `strokeWidth: 1.5` globally. One family for the entire app. Never hand-roll SVG icons.
- **Sizes:** 20px in body text, 24px in inputs and badges, 28px in kiosk nav tabs, 32px in scan-toast card chrome, 40px in mobile FAB.
- **Active state:** icons in active kiosk nav tabs colour `{colors.ink}`; inactive `{colors.charcoal}`.

No emoji as system glyphs. User-chosen emojis on quick-add tiles are the explicit exception — those belong to the household, not the design system.

---

## Photography

- **Product photos** carry the entire visual interest of the inventory surfaces. They are the design.
- **Cache locally** — never hotlink Open Food Facts images at render time. Store at `/data/images/products/{barcode}.jpg`, served as `<Image>` via Next.js.
- **Fallback** when no image exists: a `{colors.surface-elevated}` tile with the item's first initial set in `{typography.display-lg}` `{colors.charcoal}`. Never use an icon, never use a placeholder gradient.
- **AI photo capture** (mobile) renders inside a `{rounded.2xl}` bottom sheet at 4:5 portrait with `{colors.surface-light}` background — the rare light-on-dark island.

---

## Components

### Buttons

**`button-primary`** — the lock-anchored CTA on every surface.
- Filled `{colors.accent}`, label `{colors.accent-on}`, `{typography.button-md}`, padding 10×18, height 40px, `{rounded.md}`.
- Mobile and desktop default. One per viewport on kiosk.

**`button-primary-kiosk`** — kiosk-scale variant.
- Same fill, `{typography.button-kiosk}`, padding 16×28, height 56px, `{rounded.lg}`.
- Use anywhere the primary CTA appears on the kiosk.

**`button-ghost`** — secondary equal-weight action.
- `{colors.surface-elevated}` + 1px `{colors.hairline-strong}`, label `{colors.ink}`. Same dimensions as primary at each scale.

**`button-outline`** — tertiary.
- `{colors.canvas}` + 1px `{colors.hairline-strong}`. Inline with links or as cancel actions.

### Scan flow components (kiosk)

**`scan-mode-toggle`** — the two persistent armable buttons.
- Resting: `{colors.surface-card}` + 1px `{colors.hairline-strong}`, label `{typography.button-kiosk}` `{colors.ink}`, `{rounded.xl}`, height 96px.
- Armed Scan In: `{components.scan-mode-toggle-armed-in}` — `{colors.accent}` fill, `{colors.accent-on}` label, soft `{colors.accent-glow}` halo behind the button.
- Armed Scan Out: `{components.scan-mode-toggle-armed-out}` — `{colors.danger}` fill, `{colors.ink}` label, `{colors.danger-glow}` halo.
- Mutually exclusive. Idle timeout (default 10 min, configurable) returns both to resting state with a soft fade.

**`scan-toast-card`** — the per-scan feedback card.
- `{colors.surface-elevated}` + 1px `{colors.hairline-strong}`, `{rounded.xl}`, padding 24px.
- Contents (top to bottom): product image (square, 160px on kiosk), product name `{typography.heading-md}` `{colors.ink}`, brand `{typography.body-sm}` `{colors.charcoal}`, quantity ticker `{typography.qty-ticker}` (Geist Mono `tnum`), Nutri-Score `{components.badge-nutri}` if known.
- Enter: GSAP `scale: 0.96 → 1.0`, `y: 16 → 0`, `opacity: 0 → 1`, 200ms `{motion.easing-emphasised}`.
- Quantity ticker: digit-roll over 160ms.
- Exit: 360ms hold, then fade + slide-out 200ms.
- Success ring: `{colors.accent-glow}` 1.6× scale fade, 360ms. On Scan Out: `{colors.danger-glow}`.
- Audio: success tone on Scan In, lower tone on Scan Out, sharp error tone on unknown barcode. All toggleable.

**`qty-stepper`** — − [n] + control on inventory item detail and manual adjustment.
- `{colors.surface-elevated}` + 1px `{colors.hairline-strong}`, height 56px on kiosk and mobile, 40px on desktop. Number in `{typography.qty-card}` Geist Mono. Buttons `{rounded.md}` `{target.mobile-min}` minimum.

### Inventory

**`product-card`** — the photo-led inventory tile.
- `{colors.surface-card}` + 1px `{colors.hairline}`, `{rounded.lg}`, padding 16px.
- Layout: 1:1 product photo top (with `{rounded.md}` inner radius), name `{typography.heading-sm}` `{colors.ink}`, brand `{typography.body-sm}` `{colors.charcoal}`, bottom row: quantity `{typography.qty-card}` (Geist Mono) left, Nutri-Score `{components.badge-nutri}` right.
- Low-stock: switches to `{components.product-card-low-stock}` — same surface but 1px `{colors.danger}` border. No fill change; only the border carries the signal.
- Expiring soon: top-right `{components.badge-expiring}` overlay on the photo corner. Expired: `{components.badge-expired}`.

**`quick-add-tile`** — pinned home-screen tiles for barcode-less items.
- `{colors.surface-elevated}` + 1px `{colors.hairline-strong}`, `{rounded.lg}`, height 144px.
- User-chosen emoji or product photo top-centre at 64px, label `{typography.heading-sm}` `{colors.ink}` below. Tap = +1 (in arm-in mode) or −1 (in arm-out mode); long-press opens detail.

**`badge-nutri`** — Nutri-Score letter pill.
- A–E, fill from `{colors.nutri-a}` to `{colors.nutri-e}`. Label `{colors.ink}` (forced white on every step, including yellow — verified WCAG AA on `#ffc53d` only at body weight; we use bold 500 inside the pill to compensate; for `{colors.nutri-c}` switch label to `{colors.on-light}` instead).
- 24px height, padding 2×10, `{typography.button-md}`, `{rounded.full}`.

### Shopping list (mobile-first)

**`shopping-row`** — the list item row.
- `{colors.surface-card}` + 1px `{colors.hairline}`, `{rounded.lg}`, height 64px, padding 16px.
- Left: tappable circular tick `{rounded.full}` 32px, 1px `{colors.hairline-strong}`. Filled `{colors.accent}` when ticked.
- Centre: item name `{typography.body-lg}` `{colors.ink}`; quantity-needed `{typography.body-sm}` `{colors.charcoal}` if > 1.
- Right: store `{components.badge-store}` (user-managed colour as a 4px left dot inside the pill on `{colors.surface-elevated}` ground — store colour is a *cue*, not a fill).
- Swipe left: reveal "Remove" pill on `{colors.danger}` ground.
- Ticked: switches to `{components.shopping-row-ticked}` — `{colors.charcoal}` label with a hairline strikethrough drawn at 50% width, hairline `{colors.divider-soft}` border. Ticked rows sink to the bottom of their store section.

**`store-section-header`** — the store group label.
- `{colors.canvas}` ground, `{typography.heading-sm}` `{colors.ink}`, with a 12px store-colour dot inline before the name and a `{typography.caption}` `{colors.charcoal}` count to the right ("Woolies · 6 items").

**`mobile-fab`** — floating action.
- `{colors.accent}` fill, 64px circular, bottom-right with 24px inset. Phosphor `Plus` icon 28px `{colors.accent-on}`. Opens an action sheet ("Scan photo", "Add free-text item").

### Navigation

**`kiosk-nav-tab`** — top-level kiosk nav.
- Resting: `{colors.surface-card}`, label `{colors.charcoal}` `{typography.button-kiosk}`, `{rounded.lg}`, height 64px, padding 16×24.
- Active: `{components.kiosk-nav-tab-active}` — `{colors.surface-elevated}` + 1px `{colors.hairline-strong}`, label `{colors.ink}`.

**Mobile top bar** — fixed 56px tall, `{colors.canvas}` ground with a single bottom hairline `{colors.hairline}`. Page title `{typography.heading-md}` left, contextual icon button right (filter, settings).

**Desktop side nav** — 240px fixed, `{colors.canvas}` ground, hairline right border. Item rows 40px tall, `{typography.body-md}` `{colors.charcoal}`, active row swaps to `{colors.ink}` with a 2px `{colors.accent}` indicator at the left edge.

### Inputs & forms

**`text-input`** — default input.
- `{colors.surface-card}` + 1px `{colors.hairline-strong}`, `{typography.body-md}` `{colors.ink}`, `{rounded.md}`, padding 12×14, height 44px.
- Focus state thickens the border to `{colors.ink}` (no extra ring). Disabled: label `{colors.stone}`, border drops to `{colors.hairline}`.

**Numeric input** (thresholds, expiry days) — same chrome, value in Geist Mono `tnum`.

### Status

**`status-dot`** — 8px `{colors.accent}` circle next to "Connected" / "Synced" / "OFF queue: 3" labels.

**`badge-pill`** — neutral chip (`{colors.surface-elevated}` + 1px `{colors.hairline}`, `{typography.caption}` `{colors.body}`).

**`badge-store`** — store chip; user-set colour appears only as a 4px dot inside, not the chip's fill (so the store colour palette never has to clear contrast against text).

**`badge-expiring`** / **`badge-expired`** — `{colors.warning}`/`{colors.danger}` fills, used only on item cards.

---

## Animation (GSAP)

GSAP is feedback, not decoration. Each animation has a purpose, finishes inside `{motion.slow}` (360ms), and **must never block the next scan**.

| Cue | Trigger | Duration | Easing | Notes |
|---|---|---|---|---|
| Scan-toast enter | New scan registered | 200ms | `{motion.easing-emphasised}` | `scale 0.96→1`, `y 16→0`, `opacity 0→1`. |
| Quantity ticker roll | Quantity change inside toast | 160ms | `{motion.easing-standard}` | Digit-by-digit roll. `font-variant-numeric: tabular-nums` mandatory. |
| Success glow | Scan In success | 360ms | linear | `{colors.accent-glow}` ring `scale 1→1.6`, `opacity 0.6→0`. |
| Error glow | Unknown barcode | 360ms | linear | `{colors.danger-glow}` ring; toast text "Unknown — queued". Mode stays armed. |
| Scan-mode arm | Toggle tap | 200ms | `{motion.easing-emphasised}` | Background colour crossfade + underglow fade-in 0→1. |
| Shopping row tick | Tap circular tick | 200ms | `{motion.easing-standard}` | Tick scales 0→1 with 200ms strike-through draw; row reorders to bottom 360ms after. |
| Nutri-Score badge reveal | Scan-toast settle | 120ms | `{motion.easing-standard}` | Slight scale from 0.9. |
| Pantry-health visual | Reports view enter | 600ms (one-off, scrolled into view) | `{motion.easing-emphasised}` | Stagger bars by 40ms. Allowed to exceed `{motion.slow}` because it runs once per view. |

Implementation rules:

- **All GSAP via `@gsap/react`'s `useGSAP`.** Never use the bare `gsap` API inside React effects — leaks animations across route changes.
- **Respect `prefers-reduced-motion`.** Wrap every timeline in `gsap.matchMedia()` and ship a static (no-tween, instant end-state) variant.
- **Never animate layout properties** (`top/left/width/height`) — only `transform` and `opacity`. The kiosk PC is not necessarily fast.
- **Scan-toast does not block input.** The scan listener is always live — a new scan during a still-animating toast must immediately kill the in-flight tween and mount the next toast.

---

## Do's and don'ts

### Do
- Sit on `{colors.canvas}` (true black) by default on every surface.
- Reserve `{colors.accent}` for `{components.button-primary}`, the Scan In armed state, the mobile FAB, the success ring, and the status dot — nowhere else.
- Set every display headline in **Geist** at weight 600 with `lineHeight: 1.0` and tight negative tracking.
- Render **every number** (quantities, barcodes, expiry days, intervals) in **Geist Mono** with `tabular-nums`.
- Build elevation from translucent-white hairlines (`{colors.hairline}` / `{colors.hairline-strong}`).
- Use one Phosphor icon family at `strokeWidth: 1.5` for every system glyph.
- Use Australian English in every visible string ("colour", "organise", "tinned tomatoes").
- Keep tap targets at `{target.kiosk-min}` (56px) minimum on kiosk and `{target.mobile-min}` (48px) on mobile.
- Test scan feedback physically on the kiosk — the laptop preview lies about glare and viewing distance.

### Don't
- Don't use a near-black canvas. The brand sits on `#000000`, not `#0a0a0a`.
- Don't reach for editorial serif display type. No Fraunces, no Instrument Serif, no Domaine — this is a household kitchen app, not a magazine.
- Don't apply `{colors.accent}` to body text, chrome, links, or borders. It is a flat fill, never a gradient.
- Don't reuse Nutri-Score colours (`{colors.nutri-a}`–`{colors.nutri-e}`) for CTAs, status badges, or surfaces. They belong to nutrition data only.
- Don't add drop shadows to dark surfaces. Hairline + atmospheric glow carry depth.
- Don't introduce a third typeface. Geist + Geist Mono is the whole stack.
- Don't paint the kiosk in warm cream/beige to feel "kitchen-y". This is the premium-consumer LLM default — see `design-taste-frontend` §4.2.
- Don't let a GSAP animation block a scan. The scanner wedge listener is always live; toasts kill and replace, never queue and stall.
- Don't mix Phosphor with Lucide / Heroicons / Tabler. One icon family across the whole app.
- Don't hand-roll SVG icons. If a glyph is missing, install a second Phosphor weight or compose from primitives.

---

## Responsive behaviour

### Breakpoints

| Name | Width | Key changes |
|---|---|---|
| Kiosk | fixed 1920×1080 (also tested at 1366×768) | 4-up product grid, 5-up quick-add grid, 96px scan-mode toggles pinned top. |
| Desktop XL | ≥ 1440px | 1200–1400px content, 3-up reports cards. |
| Desktop | 1024–1439px | 1024px content, 2-up reports cards, sidebar nav 240px. |
| Tablet | 768–1023px | Renders mobile layout in a wider container; sidebar nav collapses to top bar. |
| Mobile Large | 426–767px | Single-column shopping list; FAB 64px bottom-right. |
| Mobile | ≤ 425px | Single-column; FAB 56px; section paddings collapse one step (`{spacing.xl}` → `{spacing.lg}`). |

### Touch targets
- Kiosk buttons floor at `{target.kiosk-min}` (56px). Scan-mode toggles at `{target.kiosk-arm}` (96px).
- Mobile buttons floor at `{target.mobile-min}` (48px). FAB 64px.
- Desktop buttons can drop to `{target.desktop-min}` (36px) for chrome only (toolbar, nav).

### Collapsing strategy
- Kiosk is fixed-aspect — no collapse logic. Build to the device and confirm physically.
- Tablet and mobile share layouts; tablet just gets a wider container and a 2-up inventory grid in the desktop-admin views.
- Desktop side nav collapses to top-bar hamburger below 1024px.
- Hero display sizes clamp: `{typography.display-xxl}` 80 → 56 → 40 across kiosk → desktop → mobile.

### PWA & offline
- Installable on mobile home screen; standalone display mode for the kiosk shell.
- Offline shell: shopping list reads + ticks must succeed offline and reconcile on reconnect (stretch goal — minimum is a clear "offline" banner with `{colors.warning}` `{components.badge-pill}` in the top bar).

---

## Iteration guide

1. Build one component at a time. Most surfaces share `{colors.surface-card}` or `{colors.surface-elevated}` with `{rounded.lg}` — only the role-specific tokens differ.
2. Reference tokens by name (`{colors.accent}`, `{components.scan-toast-card}`, `{rounded.lg}`). Do not paraphrase.
3. When you reach a decision this document does not cover, fall back to `design-taste-frontend`. When it is also silent, ask before improvising.
4. Add new variants as separate entries (`-armed-in`, `-armed-out`, `-low-stock`, `-ticked`). Do not bury them in prose.
5. Keep `{colors.accent}` scarce — one solid green surface per viewport. If a second feels needed, switch one to `{components.button-ghost}`.
6. Before merging UI work, audit the touched surface against the **anti-default discipline** block above.

---

## Known gaps

- Light-theme tokens for desktop reports/admin are not fully extracted. Until they are, run the app dark-only.
- Pressed/active states are documented for `{components.button-primary}` (via `{colors.surface-light}`) and the scan-mode toggles; other components rely on a 1px focus-thicken on the existing border.
- Print styles for monthly reports are out of scope.
- Store-colour palette is user-managed — we expose a curated 10-colour picker in settings (not yet specified here). Until that picker exists, use `{colors.charcoal}` for the store dot.
