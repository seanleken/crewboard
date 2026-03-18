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
  page.tsx                          # Landing page (public)
  login/page.tsx                    # Login form
  register/page.tsx                 # Register form
  actions/auth.ts                   # Server actions: loginAction, registerAction, signOutAction
  dashboard/
    page.tsx                        # Server component — fetches schedules, renders layout
    ScheduleGenerator.tsx           # Client — form, draft/save state
    PastSchedulesList.tsx           # Client — list with inline delete confirmation
    schedules/[id]/
      page.tsx                      # Server — schedule detail view
      DeleteButton.tsx              # Client — inline delete confirmation
  api/
    auth/[...nextauth]/route.ts
    schedules/
      generate/route.ts             # POST — runs algorithm, returns draft (no DB write)
      route.ts                      # GET list, POST save
      [id]/route.ts                 # GET single, DELETE

components/
  ScheduleTable.tsx                 # Shared flight table (dashboard + detail page)

lib/
  prisma.ts                         # Prisma singleton
  schedule-generator.ts             # Core algorithm

config/
  airlines.json                     # Airline ICAO codes, names, hub airports
  aircraft-families.json            # Aircraft family IDs and ICAO type codes

scripts/
  seed.ts                           # AeroAPI seeder (tsx --env-file=.env scripts/seed.ts)

auth.ts                             # NextAuth config (Credentials provider, JWT)
proxy.ts                            # Route protection — Next.js 16 uses proxy.ts, NOT middleware.ts
```

## Key Architecture Decisions

### Draft / Save Flow
Generate and save are **two separate steps** by design:
- `POST /api/schedules/generate` — runs the algorithm, returns the result, **no DB write**
- `POST /api/schedules` — persists the draft to the database

The `ScheduleGenerator` component holds the draft in local state. After a successful save it calls `router.refresh()` which triggers the server component (`dashboard/page.tsx`) to re-fetch the past schedules list.

### Schedule Generation — Two Modes
Detected automatically from hub count in `config/airlines.json`:

| Hubs | Mode | Behaviour |
|------|------|-----------|
| 1 | `out-and-back` | Paired flights — outbound + return from single base. Aircraft type is enforced consistent within each pair. Legs must be even. |
| 2+ | `chain` | Sequential — each leg departs from where the previous landed. No pairing or aircraft consistency constraint. Odd/even legs both valid. |

When stuck at an outstation with no routes in the DB, the algorithm generates a **fictional leg** to a random hub and marks it `isGenerated: true`. This is displayed with an `est.` badge in the table.

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

Brand colour scale is `brand-{50..900}` (defined in `tailwind.config.ts`). Key patterns:
- Cards: `bg-white border border-gray-200 rounded-lg shadow-sm p-6`
- Primary button: `bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-md`
- Secondary button: `bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2.5 rounded-md`
- Inputs: `border border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 px-3 py-2.5 rounded-md`
- ICAO codes and flight numbers: always `font-mono`
- Duration format: `1h 05m` (not "65 minutes")

No component libraries (no shadcn, Radix, Headless UI). No form libraries. Hand-built components only.

## Environment Variables

```
DATABASE_URL        Neon PostgreSQL connection string (required)
AUTH_SECRET         Random secret for NextAuth JWT signing (required)
AUTH_URL            App base URL, e.g. http://localhost:3000 (required)
AEROAPI_KEY         FlightAware AeroAPI key (only needed for seeding)
```
