# Project Brief: Pantry Tracker

**Project name (working title):** Pantry Tracker
**Owner:** Leigh Ericksen
**Type:** Self-hosted household web app
**Status:** Brief v1.1 — Finalised, build-ready — 13 June 2026

---

## 1. Overview

A single-household pantry inventory and shopping list app, self-hosted in a Docker container on the homelab. The primary interface is a wall-mounted touchscreen PC in the kitchen with a USB barcode scanner attached. Items are scanned in as shopping is unpacked and scanned out as they're used. When stock for an item drops below a user-defined threshold, it's automatically added to the shopping list, which is accessible from mobile while out shopping.

The app should feel fast, modern, and genuinely pleasant to use. Friction kills household adoption — every core action (scan in, scan out, check the list) must be achievable in seconds.

**Single user / single household.** No multi-tenancy, no user roles, no per-user data separation.

---

## 2. Goals

1. Always know what's in the pantry, fridge, and freezer without opening them.
2. Never run out of staples — automatic shopping list driven by thresholds.
3. Make unpacking the shopping a sub-2-minute job: arm scan mode, scan everything, done.
4. Reduce food waste via expiry tracking and a "use soon" view.
5. Build useful purchase history over time: frequency, spend patterns, consumption insights.
6. Integrate with the existing homelab ecosystem (Home Assistant, n8n) via API and webhooks.

## 3. Non-goals

- Multi-user accounts, permissions, or sharing between households.
- Recipe management or meal planning (possible future phase, not now).
- Native mobile apps — responsive web/PWA only.
- Supermarket price comparison or live pricing data.
- Partial quantity tracking (grams/millilitres). Everything is count-based.

---

## 4. Users & devices

| Context | Device | Primary actions |
|---|---|---|
| Kitchen kiosk | Touchscreen PC + USB barcode scanner | Scan in/out, quick-add, browse inventory |
| Out shopping | Mobile phone | Shopping list (grouped by store), tick off items, photo capture for AI add |
| Admin/desktop | Desktop PC | Settings, reports, data cleanup, store management |

The USB barcode scanner presents as a HID keyboard. The app must capture scan input globally (scanner wedge listener) regardless of which element has focus, distinguishing scans from human typing by input speed and terminator character (Enter/CR).

---

## 5. Core features

### 5.1 Scan modes (kiosk)

- Two large persistent toggle buttons: **Scan In** and **Scan Out**. Mutually exclusive.
- Arming a mode keeps it active until manually disarmed or after a configurable idle timeout (default 10 minutes) — no screen touches needed between scans.
- While armed, each scan of the same barcode adjusts quantity by 1 (in or out). Visual + audio feedback per scan (item name, photo, new quantity, satisfying GSAP animation).
- Scanning out an item at quantity 0 prompts: add to shopping list anyway / ignore.
- Unknown barcode while scanning in triggers the product lookup flow (5.2) without breaking the armed mode — queue it and keep scanning, resolve unknowns at the end.

### 5.2 Product data & lookup

Lookup order when a new barcode is scanned:

1. **Local database** — known item, just adjust quantity.
2. **Open Food Facts API** — pull as much as available: product name, brand, image, categories, quantity/size, Nutri-Score, NOVA group, nutriments, ingredients, allergens. Cache everything locally; never re-fetch on every scan.
3. **Manual entry** — clean touch-friendly form with name, category, photo upload, store availability, threshold, default expiry rule.
4. **AI photo capture** — from mobile: photograph the product (front of pack and/or label), send to a vision model via OpenRouter, extract name, brand, size, category, and best-guess nutrition info to pre-fill the manual form for confirmation. Never auto-commit AI output without user confirmation.

Open Food Facts coverage of Australian home brands (Coles, Woolworths, ALDI) is patchy — the manual and AI paths are first-class citizens, not edge cases.

**Nutri-Score:** stored per item where available. Inventory must be sortable and filterable by Nutri-Score (A–E), including a fun "health of our pantry" summary visual.

### 5.3 Inventory

- Items belong to exactly one **category** (flat, single level): e.g. Pantry, Fridge, Freezer, Fresh Produce, Cleaning, Personal Care. Categories are user-editable.
- Each item: name, brand, barcode(s) (an item can have multiple barcodes for size variants — decide in design whether variants are separate items; default: separate items), photo, category, current quantity, threshold, stores, Nutri-Score, default expiry rule, notes.
- Views: grid (photo-led, touch-friendly) and list. Filter by category, store, Nutri-Score, low stock, expiring soon. Search with fuzzy matching.
- **Scan-out fallback (no barcode in hand):** a "Quick Use" view — touch grid of items sorted by likelihood of use (frequency-weighted, in-stock first). One tap = quantity −1. This is essential, not optional; packaging goes in the bin.
- **Quick-add buttons** for barcode-less items (fresh produce, bakery, butcher, bulk): user-defined tiles with photo/emoji, one tap to add or use. Pinned to the kiosk home screen.

### 5.4 Expiry tracking

- Optional expiry date on scan-in. Configurable per category whether the app prompts for it (e.g. Fridge/Fresh: prompt; Pantry/Cleaning: don't).
- **Auto-expiry rules:** each item can carry a default shelf life (e.g. bananas 5 days, bread 4 days, milk 7 days). On scan-in or quick-add, expiry auto-calculates from today; user can override. AI suggests sensible defaults for new fresh items.
- **Use Soon** view: items expiring within N days (default 3), sorted soonest first. Expired items flagged distinctly.
- Optional webhook/notification when items hit "use soon" (consumed by n8n/HA — see 5.7).

### 5.5 Shopping list

- Items are added automatically when quantity drops below their threshold, and manually from any view or from the list itself (free-text add for one-offs).
- Each item records which **stores** it can be bought from (many-to-many). Stores are user-managed (name, colour, optional logo).
- **Group by store is the default list view.** Items available at multiple stores appear under a preferred store (item-level preferred store setting) with a badge showing alternatives. A flat "all items" view also available.
- Mobile-first UI: big tap targets, tick to mark purchased, swipe to remove. Ticked items grouped at the bottom, cleared on "complete shop".
- **Completing a shop** offers to scan/confirm purchases back into inventory — or just untick and rely on the scan-in session at home (default flow: scan in at home).
- List is shareable in read-only form via a tokenised URL (handy for sending to a partner without login friction) — optional, off by default.

### 5.6 Purchase history & insights

- Every quantity change is logged as an event: timestamp, item, delta, source (scan/quick-use/manual/AI), expiry if set.
- Derived insights per item: last bought, average purchase interval ("you buy milk every 4 days"), average consumption rate, suggested threshold ("based on usage, set milk threshold to 2").
- **Reports view:** monthly in/out volumes, most-used items, waste log (items that expired unused), Nutri-Score trend of purchases over time.
- **AI insights (OpenRouter, cheap text model):** a natural-language monthly summary — buying patterns, waste callouts, suggestions. Generated on demand or on a schedule via the API, not on every page load.

### 5.7 Integrations (API, webhooks, HA, n8n)

- **REST API** (token-authenticated) covering: inventory CRUD, quantity adjust, shopping list read/add/tick, events feed, reports data.
- **Outbound webhooks** (user-configurable URLs) for events: item added to shopping list, item below threshold, item expiring soon, shop completed, scan session completed. Payloads are simple JSON — designed to drop straight into n8n webhook nodes.
- **Home Assistant:** expose at minimum via the REST API (HA RESTful sensors): shopping list count, low-stock count, expiring-soon count, and the shopping list itself as an attribute. A native HA integration or MQTT support is a stretch goal, not required for v1.
- All AI calls go through **OpenRouter** with model IDs configurable in settings (separate settings for vision model and text model). API key stored server-side in env config, never exposed to the client.

---

## 6. Design & UX

- **Visual direction:** clean, modern, generous whitespace, photo-led inventory. Dark and light themes (kiosk likely lives in dark mode). Avoid generic admin-dashboard aesthetics — this should feel like a polished consumer product.
- **GSAP animations** throughout: scan feedback (item card flies in, quantity ticker rolls), list interactions, view transitions, the Nutri-Score summary visual. Animations must be fast and purposeful — feedback, not decoration. Respect `prefers-reduced-motion`.
- **Fully responsive** across three breakpoints: kiosk touchscreen (large tap targets, no hover-dependent UI, kiosk/fullscreen PWA mode), mobile (shopping list and photo capture optimised), desktop (admin, reports, data management).
- Audio feedback on scan (success/error tones) — toggleable.
- PWA: installable on mobile home screen, app icon, splash, offline shell for the shopping list (read + tick offline, sync on reconnect — stretch goal; minimum is graceful offline messaging).

---

## 7. Technical specification

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, latest stable), TypeScript |
| Database | SQLite via better-sqlite3 or Drizzle ORM + libSQL — single file DB, volume-mounted |
| Styling | Tailwind CSS |
| Animation | GSAP |
| AI | OpenRouter API (configurable vision + text models) |
| Product data | Open Food Facts API (v2), with local caching of all fetched data and images |
| Auth | Username/password login → long-lived session cookie (e.g. 90+ days, sliding expiry). Per-device tokens: the kiosk is provisioned once with a device token and never prompts again; same mechanism issues API tokens for n8n/HA. Compatible with Caddy forward_auth (e.g. Authelia) if preferred at proxy level |
| Deployment | Docker container (multi-stage build, standalone Next.js output), docker-compose, behind Caddy reverse proxy with public domain + TLS |

### Architecture notes

- Single container, single SQLite file on a mounted volume (`/data`). Nightly DB backup to the volume (simple file copy + rotation); homelab backup tooling handles offsite.
- Product images: cache Open Food Facts images locally on first fetch; user photos stored on the volume. Never hotlink OFF images at render time.
- Scanner wedge: global keydown listener, buffer characters arriving faster than human typing speed, commit on Enter. Must work even when no input is focused.
- Real-time-ish kiosk updates: SSE or polling so a phone action (e.g. ticking an item) reflects on the kiosk without refresh. SSE preferred.
- Rate-limit and queue Open Food Facts calls per their API guidelines; set a proper User-Agent.
- All settings (thresholds defaults, idle timeout, expiry prompts per category, AI models, webhook URLs, theme) editable in-app, stored in DB.

### Security (publicly exposed)

- Everything behind auth — no unauthenticated routes except the optional tokenised read-only shopping list.
- Password hashed with argon2 or bcrypt. Rate limiting on auth endpoints. Secure, httpOnly, sameSite cookies. CSRF protection on mutations.
- Device and API tokens listed, named, and revocable from settings (e.g. "Kitchen kiosk", "n8n", "Leigh's phone").
- OpenRouter and any secrets via environment variables only.

### Data model (indicative)

`items` (id, name, brand, category_id, photo, quantity, threshold, preferred_store_id, nutriscore, nova, default_shelf_life_days, notes, off_data JSON, created/updated)
`barcodes` (barcode PK, item_id)
`categories` (id, name, prompt_expiry bool, sort)
`stores` (id, name, colour, logo)
`item_stores` (item_id, store_id)
`stock_events` (id, item_id, delta, source, expiry_date, created_at)
`shopping_list` (id, item_id nullable, free_text nullable, store_id, status, added_by, created_at)
`settings` (key, value)
`webhooks` (id, event_type, url, enabled)

---

## 8. Phasing

**Phase 1 — Core (MVP):**
Scan in/out with armed modes, Open Food Facts lookup + manual entry, inventory with categories and thresholds, automatic shopping list grouped by store, quick-add tiles, Quick Use fallback, auth, Docker deployment, responsive UI with baseline GSAP polish.

**Phase 2 — Smart:**
AI photo capture via OpenRouter, expiry tracking with auto-rules and Use Soon view, purchase history and insights, reports, Nutri-Score sorting and pantry health visual.

**Phase 3 — Connected:**
Webhooks, REST API hardening, Home Assistant sensors, n8n recipes, AI monthly summaries, PWA offline shopping list, shareable list link.

---

## 9. Success criteria

- A full weekly shop (30+ items) can be scanned in, in under 3 minutes, with zero screen touches between scans.
- Unknown Australian products resolve via OFF, AI photo, or manual entry without breaking flow.
- Shopping list on mobile loads in under 2 seconds and is usable one-handed in a supermarket aisle.
- Items never silently run out: threshold automation is reliable and visible.
- The household actually keeps using it after week two — the real test.

## 10. Decisions log

All open questions resolved — the brief is build-ready.

1. **Size variants:** different sizes carry different barcodes and are treated as separate items, each with its own threshold, history, and stores. The multi-barcode support on a single item remains in the schema for genuine edge cases (e.g. packaging redesigns where the same product gets a new barcode), not for size variants.
2. **Source of truth:** home scan-in is the source of truth for inventory. "Complete shop" simply clears ticked items from the list; stock only increments when items are physically scanned in during unpacking.
3. **Backups:** the SQLite file lives on the mounted volume and is captured by existing machine-level homelab backups. The app's nightly local DB copy + rotation remains as a cheap safety net but no app-level offsite logic is required.
4. **Auth:** in-app username/password with long-lived sliding sessions (90+ days) and named, revocable device/API tokens. Caddy forward_auth is an optional extra layer, not the primary gate.
