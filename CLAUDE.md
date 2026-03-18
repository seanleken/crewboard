# CrewBoard

Flight schedule generator for flight sim pilots. Users pick an airline, aircraft family, max leg duration, and number of legs — the app builds a realistic schedule from cached real-world route data.

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | **Tailwind CSS v3** (NOT v4 — downgraded intentionally) |
| Auth | NextAuth v5 `5.0.0-beta.30` (no stable v5 exists yet) |
| ORM | **Prisma v5** (NOT v7 — v7 moved `url` out of `schema.prisma`, incompatible with our setup) |
| Database | Neon PostgreSQL (serverless) |
| Deployment | Vercel |

## Commands

```bash
npm run dev           # start dev server
npm run seed [ICAO]   # seed route data for one airline (e.g. npm run seed DLH) or all
npx prisma db push    # push schema changes to Neon (no migration files)
npx prisma studio     # browse database
npx prisma generate   # regenerate client after schema changes (also runs on db push)
```

## Project Structure

```
app/
  page.tsx                          # Landing page (public, auth-aware CTAs)
  error.tsx                         # Global error boundary
  not-found.tsx                     # Custom 404 page
  login/page.tsx                    # Login form
  register/page.tsx                 # Register form
  actions/auth.ts                   # Server actions: loginAction, registerAction, signOutAction
  dashboard/
    layout.tsx                      # Shared sidebar layout for all authenticated pages
    error.tsx                       # Dashboard-scoped error boundary
    page.tsx                        # Schedule generator only (no past schedules list)
    ScheduleGenerator.tsx           # Client — form, draft/save state
    schedules/
      page.tsx                      # Saved schedules list (dedicated page)
      [id]/
        page.tsx                    # Schedule detail view
        DeleteButton.tsx            # Client — inline delete confirmation
    flights/
      [flightId]/
        page.tsx                    # Flight detail — SimBrief dispatch + METAR + route map
    settings/
      page.tsx                      # Settings placeholder (email display)
  api/
    auth/[...nextauth]/route.ts
    schedules/
      generate/route.ts             # POST — runs algorithm, returns draft (no DB write)
      route.ts                      # GET list, POST save
      [id]/route.ts                 # GET single, DELETE

components/
  Sidebar.tsx                       # Fixed sidebar nav (desktop) + slide-over (mobile)
  ScheduleTable.tsx                 # Client component — shared flight table, clickable rows
  RouteMap.tsx                      # Client component — Mapbox GL dark route map

lib/
  prisma.ts                         # Prisma singleton
  schedule-generator.ts             # Core algorithm
  metar.ts                          # AviationWeather.gov fetch with 30-min revalidation cache
  simbrief.ts                       # SimBrief dispatch URL builder
  airports.ts                       # Airport coordinate lookup (from config/airports.json)

config/
  airlines.json                     # Airline ICAO codes, names, hub airports
  aircraft-families.json            # Aircraft family IDs and ICAO type codes
  airports.json                     # ~28k airport coordinates (mwgg/Airports dataset)

scripts/
  seed.ts                           # AeroAPI seeder (tsx --env-file=.env scripts/seed.ts)

auth.ts                             # NextAuth config (Credentials provider, JWT)
proxy.ts                            # Route protection — Next.js 16 uses proxy.ts, NOT middleware.ts
```

## Service Layer

All database access goes through `lib/services/` — never import `prisma` directly in pages, API routes, or server actions.

| File | Purpose |
|------|---------|
| `lib/services/schedules.ts` | Schedule + flight CRUD (`listSchedules`, `getSchedule`, `createSchedule`, `markScheduleComplete`, `deleteSchedule`, `getFlight`, `markFlightComplete`, `getSchedulesWithFlights`) |
| `lib/services/users.ts` | User lookups + creation (`findUserByEmail`, `createUser`) |

`lib/prisma.ts` and `lib/schedule-generator.ts` may import Prisma directly — they are infrastructure/algorithm libs, not request handlers.

## Key Architecture Decisions

### Draft / Save Flow
Generate and save are **two separate steps** by design:
- `POST /api/schedules/generate` — runs the algorithm, returns the result, **no DB write**
- `POST /api/schedules` — persists the draft to the database

The `ScheduleGenerator` component holds the draft in local state. After a successful save it calls `router.refresh()`. Past schedules live at `/dashboard/schedules`, not on the dashboard page.

### Schedule Generation — Two Modes
Detected automatically from hub count in `config/airlines.json`:

| Hubs | Mode | Behaviour |
|------|------|-----------|
| 1 | `out-and-back` | Paired flights — outbound + return from single base. Aircraft type is enforced consistent within each pair. Legs must be even. |
| 2+ | `chain` | Sequential — each leg departs from where the previous landed. No pairing or aircraft consistency constraint. Odd/even legs both valid. |

When stuck at an outstation with no routes in the DB, the algorithm generates a **fictional leg** to a random hub and marks it `isGenerated: true`. This is displayed with an `est.` badge in the table.

### Sidebar Layout
All authenticated pages share `app/dashboard/layout.tsx` which renders `components/Sidebar.tsx`. The sidebar is fixed-width (220px) on desktop. On mobile it collapses to a top bar with a hamburger slide-over. The layout handles the auth check — individual pages do not need their own redirect.

### Flight Detail Page
`/dashboard/flights/[flightId]` shows a single `ScheduleFlight` with:
- **SimBrief dispatch** — URL built in `lib/simbrief.ts`, opens in new tab pre-filled
- **METAR weather** — fetched server-side via `lib/metar.ts` using AviationWeather.gov, streamed via React Suspense, 30-min revalidation cache
- **Route map** — Mapbox GL `dark-v11` in `components/RouteMap.tsx`, great-circle arc computed manually, amber/green markers

`ScheduleTable` rows are clickable links to flight detail for saved schedules (flights with an `id`). Draft rows are not clickable.

### Seeding Strategy
Routes are fetched from **FlightAware AeroAPI** and cached in Postgres — no live API calls at runtime.

The seeder hits `/airports/{hub}/flights?airline={icao}` for **each hub** of each airline (not the operator endpoint, which skews towards the busiest hub). Pages per hub is calculated as `ceil(TARGET_PAGES_PER_AIRLINE / hubCount)` to keep API usage roughly equal across airlines. The AeroAPI spec is at `aeroapi.yml` in the project root.

Route data lives in the `Route` table. Re-running the seeder for an airline deletes and replaces its routes (idempotent).

### Auth
NextAuth v5 with Credentials provider. Session strategy is JWT. The session is extended to include `user.id` via a `session` callback in `auth.ts` and the `types/next-auth.d.ts` declaration file.

Route protection is in `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`).

## Version-Specific Gotchas

- **Tailwind v3**: config is in `tailwind.config.ts`. PostCSS uses `tailwindcss` + `autoprefixer`. Do not use `@tailwindcss/postcss` or `@import "tailwindcss"` syntax (those are v4).
- **Prisma v5**: `url = env("DATABASE_URL")` lives in `prisma/schema.prisma`. After any schema change run `npx prisma db push` then `npx prisma generate`.
- **NextAuth v5 beta**: config export is `{ handlers, signIn, signOut, auth }` from `auth.ts`. Pages are configured with the `pages` key (e.g. `pages: { signIn: '/login' }`). The `AuthError` import is from `next-auth`.
- **Next.js 16**: dynamic route params are a `Promise` — always `await params` in route handlers and page components.

## Design System

The app is **dark-themed only** — no light mode. Font is **Plus Jakarta Sans** (via `next/font/google`).

### Colour tokens (defined in `tailwind.config.ts`)

**Backgrounds** (darkest → lightest):
- `bg-dark-sidebar` — sidebar (`#0C0F14`)
- `bg-dark-primary` — page background (`#111318`)
- `bg-dark-card` — cards and panels (`#1A1D24`)
- `bg-dark-elevated` — hover states, inputs, active items (`#22262E`)
- `bg-dark-border` / `border-dark-border` — borders (`#2A2E37`)

**Text**:
- `text-[#F1F2F4]` — primary text (headings, values)
- `text-gray-400` — secondary text (labels, metadata)
- `text-gray-500` — tertiary text (placeholders, disabled)

**Accent (amber)**:
- `accent-400` (`#FFC107`) — primary interactive colour (buttons, links, active nav)
- `accent-500` (`#FFB300`) — hover
- `accent-600` (`#FFA000`) — active/pressed

**Semantic**:
- `text-blue-400` / `bg-blue-400/10` — hub airport badges, out-and-back mode badge
- `text-green-400` — saved indicator, arrival marker on route map
- `text-red-400` — destructive actions
- `text-amber-300` / `bg-amber-900/20` — `est.` badge for generated flights, error banners

### Key patterns

- Cards: `bg-dark-card border border-dark-border rounded-lg p-6`
- Primary button: `bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2.5 rounded-md`
- Secondary button: `bg-dark-elevated hover:bg-dark-border text-gray-400 hover:text-[#F1F2F4] border border-dark-border px-4 py-2.5 rounded-md`
- Destructive button: `bg-transparent hover:bg-red-900/20 text-red-400 border border-red-400/20 px-4 py-2.5 rounded-md`
- Inputs: `bg-dark-elevated border border-dark-border focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 text-[#F1F2F4] px-3 py-2.5 rounded-md`
- ICAO codes and flight numbers: always `font-mono`
- Duration format: `1h 05m` (not "65 minutes")
- No shadows — elevation is communicated through background colour difference

No component libraries (no shadcn, Radix, Headless UI). No form libraries. Hand-built components only.

## Environment Variables

```
DATABASE_URL                Neon PostgreSQL connection string (required)
AUTH_SECRET                 Random secret for NextAuth JWT signing (required)
AUTH_URL                    App base URL, e.g. http://localhost:3000 (required)
AEROAPI_KEY                 FlightAware AeroAPI key (only needed for seeding)
NEXT_PUBLIC_MAPBOX_TOKEN    Mapbox public token for route map on flight detail page
```
