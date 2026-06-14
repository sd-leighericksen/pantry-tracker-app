# Handover — Pantry Tracker

_Last updated: 2026-06-13. Authored at end of the auth session._

## TL;DR

Scaffold + **authentication are now done**. Username/password login with
argon2id, sliding 90-day sessions, named/revocable device tokens, CSRF
origin-checking, rate-limited login, and a first-run bootstrap script are all
wired and verified end-to-end (curl flow below). `pnpm lint`, `pnpm typecheck`,
and `pnpm build` pass. Resume with **kiosk shell + scan listener → OFF client →
end-to-end scan flow**.

> First thing in a fresh checkout: `pnpm create-user` (or
> `PT_USERNAME=… PT_PASSWORD=… pnpm create-user`) to mint the household user,
> then `pnpm dev` and sign in at `/login`.

---

## What's done

### Foundational docs
- `BRIEF.md` — unchanged (project source of truth).
- `CLAUDE.md` — skills table consolidated to one design entry (`design-taste-frontend`), paths corrected to `.agents/skills/`, casing fixed for `BRIEF.md` / `DESIGN.md`.
- `DESIGN.md` — fully rewritten as a project-specific guide. Replaces the Resend-analysis source with a kiosk-first design system: dark canvas, **Geist + Geist Mono** (no editorial serif), single emerald accent `#11ff99`, separate five-step Nutri-Score scale, explicit kiosk/mobile/desktop tap-target floors (56/48/36px), and named app components (`scan-mode-toggle`, `scan-toast-card`, `product-card`, `quick-add-tile`, `shopping-row`, `qty-stepper`, `badge-nutri`). GSAP cue table included.
- `README.md` — dev quickstart + script list.

### Scaffold
- **Next.js 15.5** (App Router, standalone output, `outputFileTracingRoot` set so the lockfile-discovery warning is silent).
- **TypeScript strict** with `noUncheckedIndexedAccess` on.
- **Tailwind v4** via `@tailwindcss/postcss`. All `DESIGN.md` tokens (colours, radii, easings) declared in `@theme` inside `app/globals.css`, so `bg-canvas`, `text-ink`, `text-charcoal`, `bg-accent`, `rounded-lg`, etc. work as utilities.
- **Geist + Geist Mono** via the `geist` package; `--font-geist-sans` / `--font-geist-mono` surfaced through Tailwind's `font-sans` / `font-mono`. `prefers-reduced-motion` honoured in `globals.css`.
- **Drizzle ORM + better-sqlite3** with WAL, foreign keys ON, NORMAL sync. DB at `./data/pantry.sqlite` (configurable via `DB_PATH`).
- Schema covers all twelve tables (BRIEF §7 + auth): `categories`, `stores`, `items`, `barcodes`, `item_stores`, `stock_events`, `shopping_list`, `settings`, `webhooks`, `users`, `sessions`, `device_tokens`. Indexes added for low-stock lookups and shopping-list pending-uniqueness.
- Initial migration generated at `drizzle/migrations/0000_natural_lilandra.sql` and applied successfully.
- **ESLint flat config** with `next/core-web-vitals` + `next/typescript`. `next lint` deprecation handled — script uses `eslint .` directly.
- **Other deps installed:** `gsap`, `@gsap/react`, `@phosphor-icons/react`.
- `.env.example`, `.gitignore`, `pnpm-workspace.yaml` (declares `allowBuilds:` for the native packages — pnpm 11 requires this).

### Verified green
```
pnpm lint        ✓
pnpm typecheck   ✓
pnpm db:generate ✓
pnpm db:migrate  ✓  (writes ./data/pantry.sqlite)
pnpm build       ✓  (standalone output, 4 routes)
```

### Authentication (this session)

The full auth layer from "Next steps §1" is built and verified.

- **`lib/password.ts`** — pure argon2id (hash-wasm), 64 MiB / 3 passes, encoded
  PHC strings. No `server-only`/DB deps, so CLI scripts can reuse it. Carries a
  real `DUMMY_HASH` used to equalise verify timing for unknown usernames
  (anti-enumeration).
- **`lib/auth.ts`** (`server-only`) — `hashPassword`/`verifyPassword`
  (re-exported), `createSession`, `validateSession`, `getCurrentUser`,
  `destroySession`, `authenticate`. Session token is random 32 bytes in the
  cookie; DB stores only its **SHA-256** (`sessions.id`), so a DB leak can't be
  replayed. **Sliding 90-day** expiry: slides forward once past the halfway
  mark. Cookie `pt_session`: `httpOnly`, `sameSite=lax`, `secure` in prod.
- **`lib/auth-constants.ts`** — edge-safe `SESSION_COOKIE` constant, the *only*
  thing `middleware.ts` imports from the auth modules (keeps better-sqlite3 /
  node:crypto out of the edge bundle — verified: middleware bundle is 34 kB).
- **`lib/device-tokens.ts`** — named, revocable bearer tokens (`ptk_` prefix,
  SHA-256 stored). `issueDeviceToken` (raw shown once), `verifyBearer`,
  `listDeviceTokens`, `revokeDeviceToken`, `lastUsedAt` touch. **No settings UI
  yet** — the module is ready, the mint/list/revoke screen is still to build.
- **`lib/rate-limit.ts`** — in-memory fixed-window limiter (single container, no
  Redis). Login is 10 attempts / 15 min / IP → 429 + `Retry-After`.
- **`middleware.ts`** — optimistic cookie gate (redirect pages → `/login?next=`,
  401 JSON for `/api/*`) + **CSRF**: same-origin `Origin` check on
  POST/PUT/PATCH/DELETE *unless* an `Authorization` header is present (bearer
  API calls are CSRF-immune). Public paths: `/login`, `/api/auth/login`.
  Authoritative session validation still happens in the data layer, not here.
- **Routes/UI:** `app/login/page.tsx` (+ `components/LoginForm.tsx`),
  `POST /api/auth/login`, `POST /api/auth/logout`, `components/LogoutButton.tsx`.
  `app/page.tsx` now does the real `getCurrentUser()` check and greets the user.
- **`scripts/create-user.ts`** (`pnpm create-user`) — first-run bootstrap.
  Interactive (masked password via raw-mode), or `--username/--password` flags,
  or `PT_USERNAME`/`PT_PASSWORD` env. Refuses if a user exists unless `--force`
  (which resets the password). Single-household model.

**Verified end-to-end via curl** against `pnpm dev`: unauth home → 307→`/login`;
wrong password → 401; cross-origin mutation → 403; correct login → 200 +
`Set-Cookie` (httpOnly, lax, 90-day); authed home → 200; `/api/*` no-auth → 401
JSON; logout clears cookie; 429 after the attempt ceiling. A test user `leigh`
exists in the local DB (password `pantry-test-pw`) — delete or reset before
prod.

**Not yet built from §1:** the Settings UI to mint/list/revoke device tokens
(the `lib/device-tokens.ts` API is ready for it).

---

## Environment notes

- **pnpm:** installed via the standalone script (corepack hit a `/usr/local/bin` permission error). Lives at `~/Library/pnpm/bin/pnpm` v11.6.0. The installer appended the PATH export to `~/.zshrc`. To pick it up in your terminal, run `source ~/.zshrc` or open a new shell.
- **Native builds:** `better-sqlite3` and `sharp` are listed under `allowBuilds:` in `pnpm-workspace.yaml`. If you regenerate the lockfile fresh, pnpm 11 may prompt about these — answer yes once and they'll be cached.
- **Node:** v24.12.0 in use. Next 15 + React 19 are compatible.
- **No git repo initialised yet.** When you're ready, `git init && git add . && git commit -m "chore: initial scaffold"`. CLAUDE.md asks for conventional commits.

---

## File map

```
app/
  layout.tsx          # root, dark canvas, Geist fonts, en-AU lang
  page.tsx            # home — getCurrentUser() gate + greeting + logout
  globals.css         # @theme tokens from DESIGN.md
  login/page.tsx      # sign-in screen (redirects if already authed)
  api/auth/
    login/route.ts    # POST — rate-limited, sets session cookie
    logout/route.ts   # POST — destroys session
middleware.ts         # edge gate + CSRF origin check
components/
  LoginForm.tsx       # client sign-in form
  LogoutButton.tsx    # client logout button
hooks/                # empty
lib/
  db.ts               # drizzle + better-sqlite3 with pragmas
  auth.ts             # sessions, getCurrentUser, authenticate (server-only)
  auth-constants.ts   # edge-safe SESSION_COOKIE (imported by middleware)
  password.ts         # pure argon2id hash/verify (reusable in scripts)
  device-tokens.ts    # mint/verify/list/revoke bearer tokens
  rate-limit.ts       # in-memory fixed-window limiter
drizzle/
  schema.ts           # 12 tables, fully typed
  migrations/
    0000_natural_lilandra.sql
    meta/
scripts/
  migrate.ts          # tsx-run migration runner
  create-user.ts      # first-run household-user bootstrap (pnpm create-user)
data/
  pantry.sqlite       # local DB, gitignored
.env.example
.gitignore
README.md
HANDOVER.md           # this file
drizzle.config.ts
next.config.ts        # output: standalone, outputFileTracingRoot pinned
eslint.config.mjs
postcss.config.mjs
pnpm-workspace.yaml   # allowBuilds: for native packages
package.json
tsconfig.json
```

---

## Decisions worth knowing (not rederivable from code)

1. **Design system is `design-taste-frontend` only.** All other installed skills (`high-end-visual-design`, `minimalist-ui`, `gpt-taste`, `brandkit`, the `gsap-*` skills, the `nextjs-*` skills, etc.) are NOT independent design authorities. CLAUDE.md and `DESIGN.md` are the only entry points for visual decisions.
2. **No editorial serif.** Geist is the entire sans stack; Geist Mono carries every number (`tabular-nums` globally). Explicitly rejecting the original Resend `DESIGN.md` direction with Domaine Display.
3. **One brand accent: `#11ff99` (emerald).** Reserved for primary CTAs, the Scan In armed state, the mobile FAB, the success glow ring, and the status dot. Nutri-Score colours never leak into chrome.
4. **Stock events are append-only.** `items.quantity` is a denormalised snapshot. The mutation path lives in `lib/stock.ts` (not yet written) and must be the only writer.
5. **OFF integration is non-negotiable.** Every Open Food Facts call goes through `lib/off-client.ts` (not yet written) with a 15 req/min queue — see the `open-food-facts` skill at `.agents/skills/open-food-facts/`.
6. **Scanner wedge listener is bound once** at the kiosk shell in capture phase. No per-component keyboard listeners for scan input. See the `barcode-scanner-wedge` skill.

---

## Next steps

In recommended order. Each is roughly one focused session.

### 1. Authentication — ✅ DONE (see "Authentication" under What's done)
Only remaining slice: the **Settings UI** to mint/list/revoke device tokens.
`lib/device-tokens.ts` already exposes everything that screen needs. Park it
until there's a settings surface to hang it on (it's not blocking the kiosk).

### 2. Kiosk shell + global scan listener (next up)
- Route group `app/(kiosk)/` with its own layout (no nav chrome, fixed-aspect).
- `hooks/useScannerWedge.ts`: capture-phase keydown listener on `document`, buffer characters arriving < ~30ms apart, commit on Enter, ignore when interval > ~80ms (human typing). Strip `02`/`2`-prefixed variable-weight barcodes — route those to quick-add (BRIEF §10).
- `components/ScanShell.tsx` mounts the listener once. Provides scan context via React context.
- Scan-mode toggles (the 96px buttons) and audio unlock on the arming tap.
- Read the `barcode-scanner-wedge` skill in full before writing this code.

### 3. `lib/off-client.ts`
- Queue with 15 req/min ceiling; serialise calls; backoff on 429.
- User-Agent from `OFF_USER_AGENT` env (required by OFF policy).
- Image caching to `./data/images/products/{barcode}.{ext}` — never hotlink at render.
- Persist the full payload to `items.off_data` (JSON column).
- Read the `open-food-facts` skill before writing.

### 4. End-to-end scan flow
- `POST /api/scan` server action: lookup → `stock_events` write → `items.quantity` update → optional shopping-list add when crossing threshold.
- `components/ScanToast.tsx` — the GSAP feedback card from DESIGN.md. Uses `@gsap/react`'s `useGSAP`; kills in-flight tween if a new scan arrives.
- Optimistic UI on the kiosk; reconcile with server response.
- SSE channel for kiosk → phone sync (or polling first, SSE later).

### 5. Inventory views
- Photo-led grid (4/3/2 columns by viewport), low-stock and Nutri-Score filters, fuzzy search.

### 6. Shopping list (mobile)
- Group by store; tick / swipe-remove; "Complete shop" clears without incrementing stock.

### 7. Docker + Caddy
- Multi-stage Dockerfile (deps → builder → runner). Standalone output goes into `runner`. `/data` volume mount.
- `docker-compose.yml` with Caddy reverse proxy in front.

---

## Resolved last session

The auth-first vs kiosk-first question is settled: the user chose **auth first**,
now done. Next session starts on the **kiosk shell + scan listener** (§2). The
kiosk will provision itself with a device token — `lib/device-tokens.ts` is
ready; `verifyBearer` is the entry point for token-authenticated requests.

---

## How to resume

```sh
cd /Users/leighericksen/Documents/localdev/pantry-tracker
source ~/.zshrc        # if pnpm isn't on PATH yet
pnpm install            # if fresh checkout
pnpm db:migrate
pnpm create-user        # mint the household user (skip if one exists)
pnpm dev                # http://localhost:3000 → /login
```

A test user already exists in the local DB: `leigh` / `pantry-test-pw`.
Reset it with `pnpm create-user --force` (or delete it) before production.

Read `BRIEF.md`, `CLAUDE.md`, `DESIGN.md`, then this file. Skills live at
`.agents/skills/` — load `open-food-facts`, `barcode-scanner-wedge`,
`vercel-react-best-practices`, and `design-taste-frontend` as needed.
