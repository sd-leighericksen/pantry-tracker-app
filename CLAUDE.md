# CLAUDE.md — Pantry Tracker

## What this project is

A single-household pantry inventory and shopping list app, self-hosted in Docker on a homelab. Primary interface is a kitchen touchscreen PC with a USB barcode scanner; secondary interfaces are mobile (shopping list) and desktop (admin/reports).

**Read `BRIEF.md` in the repo root before starting any feature work.** It is the source of truth for scope, behaviour, phasing, and resolved decisions. Do not invent features outside it; if something is ambiguous, the brief's decisions log wins. For UI work, also read `DESIGN.md` (see Design rules below).

## Stack

- Next.js (App Router, latest stable), TypeScript strict mode
- SQLite via Drizzle ORM — single file DB volume-mounted at `/data`
- Tailwind CSS
- GSAP for animation (via `@gsap/react` `useGSAP`)
- OpenRouter for all AI calls (vision + text models, configurable in settings)
- Open Food Facts API v2 for product data
- Docker multi-stage build, Next.js standalone output, behind Caddy

## Skills — load these

The following skills live in `.agents/skills/` and MUST be consulted for their domains:

| Skill | Consult when |
|---|---|
| `open-food-facts` | Any code touching product lookup, OFF API calls, barcode resolution, Nutri-Score data, or product image caching. Non-negotiable — it encodes rate limits that prevent IP bans. |
| `barcode-scanner-wedge` | Any code touching the scan listener, scan modes, keyboard input handling, or kiosk scanning UX. |
| `vercel-react-best-practices` | Writing or refactoring any React/Next.js code — server vs client components, data fetching, bundle discipline. |
| `design-taste-frontend` | All visual and UI design decisions — the single design entry point (see Design rules). |

**Design is `design-taste-frontend` only.** Other skills installed in `.agents/skills/` (e.g. `high-end-visual-design`, `minimalist-ui`, `gpt-taste`, `brandkit`, `imagegen-frontend-*`, `gsap-core`, `gsap-animations`, `nextjs-stack`, `nextjs-turbopack`, `coding-agent`) are NOT independent design authorities. Do not consult them directly for design, animation, or stack decisions — route everything through `design-taste-frontend` and `DESIGN.md`.

## Design rules

`design-taste-frontend` is the single source of design discipline.

All visual design decisions — typography, colour, spacing, layout, component aesthetics — defer to `design-taste-frontend`. Do not pull design opinions from other skills, defaults, or generic component library aesthetics.

**`DESIGN.md` in the repo root is the project-specific design guide for this app.** Read it before building any UI. Hierarchy when making design decisions:

1. `DESIGN.md` — this project's specific direction (wins on anything it covers)
2. `design-taste-frontend` — the underlying design rules and principles
3. Where both are silent — ask rather than improvise

Functional design constraints from the brief still apply alongside both:
- Kiosk: large tap targets (min 48px), no hover-dependent UI, dark mode default
- GSAP animations are feedback, not decoration — fast, purposeful, never blocking the next scan, respect `prefers-reduced-motion`
- Three breakpoints: kiosk touchscreen, mobile, desktop

## Conventions

- **File structure:** `app/` for routes, `components/` for shared UI, `lib/` for server modules (db, off-client, ai, auth, webhooks), `hooks/` for client hooks, `drizzle/` for schema and migrations.
- All external API access (OFF, OpenRouter) is server-side only, each owned by a single module in `lib/`. Never call external APIs from client components.
- Database access only through Drizzle — no raw SQL strings outside migrations.
- Secrets via environment variables only (`.env.local` in dev, Docker env in prod). Never commit secrets; keep `.env.example` current.
- Every stock quantity change goes through one mutation path that writes a `stock_events` row — never update `items.quantity` directly.
- Optimistic UI on scan actions; reconcile with server response.
- Australian English in all UI copy, comments, and docs (colour, organise, etc.).

## Workflow rules

- Before declaring any task done: `pnpm lint && pnpm typecheck` must pass. Run `pnpm test` if tests exist for the touched area.
- Migrations: generate with Drizzle Kit, never hand-edit applied migrations.
- Work in the phase order defined in brief.md §8 — don't build Phase 2/3 features while Phase 1 is incomplete unless explicitly asked.
- Keep PRs/commits scoped to one feature or fix. Conventional commit messages.
- When touching the scanner or OFF integration and the skill guidance proves wrong or incomplete in practice, fix the code AND update the relevant skill so the lesson sticks.

## Things that will bite you (read twice)

- OFF rate limit is 15 req/min — every OFF call goes through `lib/off-client.ts` and its queue. No exceptions, no "just this once" direct fetches.
- The scan listener is bound ONCE at the kiosk shell in capture phase. Never add per-component keyboard listeners for scanning.
- Audio requires a user gesture to unlock — the mode-arming tap is the unlock point.
- Variable-weight barcodes (prefix `02`/`2` from butcher/deli scales) are not products; route to quick-add.
- Size variants are separate items (brief decision §10.1). Multi-barcode per item exists only for packaging redesigns.
- Home scan-in is the inventory source of truth; "complete shop" never increments stock.
