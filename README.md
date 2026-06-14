# Pantry Tracker

Single-household pantry inventory and shopping list. Self-hosted, Docker.
See [`BRIEF.md`](./BRIEF.md) for scope and [`DESIGN.md`](./DESIGN.md) for UI.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · Drizzle ORM +
SQLite (better-sqlite3) · Geist + Geist Mono · GSAP · Phosphor icons.

## Dev

```sh
cp .env.example .env.local
pnpm install
pnpm db:migrate      # apply migrations to ./data/pantry.sqlite
pnpm db:seed         # seed default categories + stores
pnpm create-user     # create the single household login
pnpm dev             # http://localhost:3000 → sign in, then /kiosk
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server. |
| `pnpm build` | Standalone production build (for Docker). |
| `pnpm start` | Run the production build. |
| `pnpm lint` | Next.js ESLint. |
| `pnpm typecheck` | `tsc --noEmit` with strict mode. |
| `pnpm db:generate` | Drizzle Kit — generate migrations from schema. |
| `pnpm db:migrate` | Apply migrations to the SQLite file at `DB_PATH`. |
| `pnpm db:seed` | Seed default categories + stores (idempotent). |
| `pnpm create-user` | Create / reset the single household user (`--force`). |
| `pnpm db:studio` | Drizzle Studio. |

## Deploy (Docker + Caddy)

Multi-stage build → Next.js standalone output, behind Caddy with automatic
TLS. The SQLite DB and cached images live on the `pantry-data` volume at
`/data`; migrations run automatically on container start.

```sh
# In the environment / .env set: OFF_USER_AGENT, DOMAIN (real hostname for TLS),
# and PT_USERNAME / PT_PASSWORD for the first-run household login.
docker compose up -d --build
```

On startup each container run: applies pending migrations, then bootstraps —
seeding default categories + stores if empty and creating the household user
from `PT_USERNAME` / `PT_PASSWORD` if no user exists yet (all idempotent).

- `DOMAIN` (default `localhost`) drives Caddy's certificate. Point DNS at the
  host and set a real hostname for public TLS.
- `OFF_USER_AGENT` is required by Open Food Facts — set a real contact.
- `PT_USERNAME` / `PT_PASSWORD` only take effect on first boot (no user yet);
  rotate the password later via the app or `pnpm create-user --force`.

## Layout

```
app/         — App Router routes
components/  — shared UI
lib/         — server modules (db, off-client, ai, auth, webhooks)
hooks/       — client hooks
drizzle/     — schema + migrations
scripts/     — node-side scripts (migrate, etc.)
```

## REST API (Phase 3)

Token-authenticated JSON API for n8n / Home Assistant. Mint a token in
**Settings → Device & API tokens** (kind `api`) and send it as
`Authorization: Bearer <token>`. A logged-in session cookie also works.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/v1/stats` | — | `{ shoppingCount, lowStockCount, expiringCount, expiredCount, shoppingList[] }` — for HA sensors |
| GET | `/api/v1/inventory` | — | `{ items[] }` |
| GET | `/api/v1/shopping` | — | `{ items[] }` |
| POST | `/api/v1/shopping` | `{ text, storeId? }` | adds a free-text item |
| POST | `/api/v1/shopping/:id/tick` | `{ ticked }` | tick / untick |
| POST | `/api/v1/items/:id/adjust` | `{ delta }` | `{ quantity, addedToList }` (stock path) |
| GET | `/api/v1` | — | capability discovery (endpoint list for agents) |
| GET | `/api/v1/items/:id` | — | full item: size, nutriments (per 100g), ingredients, allergens, barcodes |
| POST | `/api/v1/items` | `{ name, category, size?, brand?, threshold?, ingredients?, allergens?, nutriments? }` | create (qty starts 0) |
| PATCH | `/api/v1/items/:id` | partial fields | edit |
| DELETE | `/api/v1/items/:id` | — | archive (remove from pantry) |
| GET | `/api/v1/events?limit=50` | — | `{ events[] }` |

LLM agents can `GET /api/v1` to discover the surface, read full nutrition /
ingredients / allergens per item, and add / edit / remove items. Stock only
changes via `/adjust`, which writes an auditable event.

Example Home Assistant RESTful sensor:

```yaml
sensor:
  - platform: rest
    name: Pantry
    resource: https://pantry.example.com/api/v1/stats
    headers:
      Authorization: !secret pantry_token
    value_template: "{{ value_json.shoppingCount }}"
    json_attributes: [lowStockCount, expiringCount, shoppingList]
```

## Webhooks (Phase 3)

Configure outbound webhook URLs in **Settings → Webhooks** (per event, or
`all`). Each fires a `POST` with `{ event, at, data }`:

| Event | Fires when |
|---|---|
| `shopping.item_added` | an item is added to the list (auto or manual) |
| `item.below_threshold` | stock drops to/below an item's threshold |
| `shop.completed` | "Complete shop" clears ticked items |
| `item.expiring_soon` | triggered by `POST /api/v1/cron/expiry-check` for newly use-soon items (run it daily from cron/n8n/HA) |

## PWA & sharing (Phase 3)

- **Installable PWA** — web manifest + service worker (network-first, offline
  fallback at `/offline`). Add to home screen on the kiosk and on mobile.
- **Shareable list** — in **Settings → Share shopping list**, create a
  read-only tokenised link (`/share/<token>`) to send the list to someone
  without a login. Off by default; regenerate or disable any time.

See [`CLAUDE.md`](./CLAUDE.md) for working rules.
