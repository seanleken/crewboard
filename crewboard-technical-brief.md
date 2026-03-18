# CrewBoard — Technical Brief (MVP)

> A realistic flight schedule generator for flight sim pilots. Pick an airline, choose an aircraft family, set your preferences, and get an operationally realistic schedule built from real-world flight data.

---

## 1. Project Overview

### What CrewBoard Does
CrewBoard generates realistic multi-leg flight schedules for flight simulator pilots. Users select an airline, aircraft family, maximum leg duration, and number of legs. The app returns a schedule using real-world route and flight number data, with the schedule structure adapting to the airline's operational profile.

### Core Differentiator
CrewBoard uses a **dual-mode schedule generation** system:
- **Single-hub airlines** (e.g. British Airways at EGLL): Classic out-and-back schedules with aircraft consistency enforced within each flight pair.
- **Multi-hub airlines** (e.g. Delta across KATL, KJFK, KMSP, etc.): Realistic hub-chaining schedules where pilots route between hubs with occasional outstation diversions — mirroring real-world multi-day crew rosters.

The mode is auto-detected based on the airline's hub configuration. This combines the airline/aircraft freedom of tools like iFly Schedules with the operational realism of career-mode addons like A Pilot's Life — without any career gating or progression.

### What CrewBoard Does NOT Do (MVP)
- No simulator connection or flight tracking
- No career progression, XP, or ranking
- No pilot fatigue or scoring systems
- No SimBrief integration
- No real-time flight data (all served from cached database)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Auth | NextAuth v5 (Auth.js) with email/password credentials |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma |
| Deployment | Vercel |
| Data Source | FlightAware AeroAPI (for seeding only) |

---

## 3. Data Architecture

### 3.1 Flight Data Strategy

CrewBoard does **not** make live API calls at runtime. Instead:

1. A **seed script** fetches route and flight data from FlightAware AeroAPI
2. Data is stored in the Neon PostgreSQL database
3. Schedule generation queries the local database only
4. The seed script can be re-run periodically to refresh data (see separate Cron Seeding Brief)

This keeps runtime costs at zero and avoids API rate limits during user interactions.

### 3.2 AeroAPI Seeding Approach

The seed script uses the **airport flights endpoint**, querying all flights (departures and arrivals) at each airline's hubs:

```
GET /airports/{hub_icao}/flights?airline={airline_icao}&max_pages=3
```

**Why this endpoint?** It returns both departures from AND arrivals into the hub in a single call. This captures hub→outstation routes (as departures) and outstation→hub routes (as arrivals). The operator endpoint (`/operators/{id}/flights`) returns all flights across all airports mixed together — for Lufthansa, the first 25+ pages are Frankfurt before Munich routes appear.

**Seeding flow per airline:**
1. For each hub in the airline's config, query flights filtered by the airline
2. From the results, extract: flight number (ident), origin ICAO, destination ICAO, aircraft type, scheduled times, duration
3. Store ALL routes — both departures and arrivals are stored as Route records
4. Deduplicate by (airlineIcao, flightNumber, originIcao, destinationIcao, aircraftIcao)
5. Upsert into the Route table

The script requires an `AEROAPI_KEY` environment variable. It should be idempotent (safe to re-run) using upsert logic. Use `max_pages=3` per hub query (45 flights per hub). Handle pagination and rate limits.

**API budget:** ~51 API calls per seed run (one per hub), ~153 billable pages. Run bi-monthly. Well within AeroAPI's free tier of 500 calls/month.

### 3.3 Airline Hub Configuration

Hubs are stored in a JSON configuration file (`config/airlines.json`), not in the database. This allows easy updates without migrations.

```json
{
  "airlines": [
    {
      "icao": "DLH",
      "name": "Lufthansa",
      "hubs": ["EDDF", "EDDM"]
    },
    {
      "icao": "AFR",
      "name": "Air France",
      "hubs": ["LFPG"]
    },
    {
      "icao": "BEL",
      "name": "Brussels Airlines",
      "hubs": ["EBBR"]
    },
    {
      "icao": "BAW",
      "name": "British Airways",
      "hubs": ["EGLL"]
    },
    {
      "icao": "AAL",
      "name": "American Airlines",
      "hubs": ["KJFK", "KLAX", "KPHL", "KDFW", "KMIA", "KCLT", "KDCA"]
    },
    {
      "icao": "UAL",
      "name": "United Airlines",
      "hubs": ["KEWR", "KORD", "KDEN", "KIAH", "KSFO", "KLAX", "KIAD"]
    },
    {
      "icao": "DAL",
      "name": "Delta Air Lines",
      "hubs": ["KJFK", "KSLC", "KMSP", "KDTW", "KBOS", "KATL", "KLAX", "KSEA"]
    },
    {
      "icao": "FFT",
      "name": "Frontier Airlines",
      "hubs": ["KATL", "KORD", "KCVG", "KCLE", "KDFW", "KLAS", "KMIA", "KMCO", "KPHX", "KDEN"]
    },
    {
      "icao": "EZY",
      "name": "easyJet",
      "hubs": ["EGCC", "EGKK", "EGGW", "LFPG", "EHAM", "LIRF", "LIMC", "LSGG", "LPPT", "EGPH"]
    },
    {
      "icao": "RYR",
      "name": "Ryanair",
      "hubs": ["EGCC", "EPKK", "LIRF", "LIPZ"]
    }
  ]
}
```

### 3.4 Aircraft Family Configuration

Also stored in a JSON configuration file (`config/aircraft-families.json`):

```json
{
  "families": [
    {
      "id": "a320",
      "name": "A320 Family",
      "icao_codes": ["A318", "A319", "A320", "A321", "A20N", "A21N"]
    },
    {
      "id": "a330",
      "name": "A330 Family",
      "icao_codes": ["A332", "A333", "A338", "A339"]
    },
    {
      "id": "b777",
      "name": "777 Family",
      "icao_codes": ["B77L", "B772", "B773", "B77W"]
    }
  ]
}
```

---

## 4. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String     @id @default(cuid())
  email          String     @unique
  hashedPassword String
  name           String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  schedules      Schedule[]
}

model Route {
  id              String   @id @default(cuid())
  airlineIcao     String   // e.g. "DLH"
  flightNumber    String   // e.g. "LH100"
  originIcao      String   // e.g. "EDDF"
  destinationIcao String   // e.g. "EDDH"
  aircraftIcao    String   // e.g. "A320"
  durationMinutes Int      // typical flight duration
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([airlineIcao, originIcao, aircraftIcao])
  @@index([airlineIcao, destinationIcao, aircraftIcao])
  @@index([airlineIcao, originIcao, destinationIcao])
}

model Schedule {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  airline   String           // ICAO code
  family    String           // family id e.g. "a320"
  baseIcao  String           // starting hub
  mode      String           // "out-and-back" or "chain"
  maxLegH   Int              // max leg duration in hours
  legs      Int              // total number of legs
  createdAt DateTime         @default(now())
  flights   ScheduleFlight[]
}

model ScheduleFlight {
  id              String   @id @default(cuid())
  scheduleId      String
  schedule        Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  sequence        Int      // 1, 2, 3, 4... order in schedule
  flightNumber    String   // real flight number from API data, or generated (±1) if no return found
  originIcao      String
  destinationIcao String
  aircraftIcao    String
  durationMinutes Int
  isGenerated     Boolean  @default(false) // true if flight number was generated (no real data for this route)

  @@index([scheduleId])
}
```

**Changes from v1:**
- `Schedule.mode` added: tracks whether "out-and-back" or "chain" was used
- `ScheduleFlight.pairIndex` and `direction` removed: not applicable to chain mode
- `ScheduleFlight.isGenerated` added: flags legs where no real return route existed in the DB and a fictional flight number was created

---

## 5. Schedule Generation Algorithm

This is the core logic of the app. It lives in a server-side service (`lib/schedule-generator.ts`).

### Inputs
- `airlineIcao`: string (e.g. "DAL")
- `familyId`: string (e.g. "a320")
- `maxLegHours`: number (e.g. 4)
- `totalLegs`: number (1–8)

### Mode Detection
```
Load airline config → get hub list
if (hubs.length === 1) → OUT_AND_BACK mode
if (hubs.length >= 2) → CHAIN mode
```

---

### Mode A: OUT_AND_BACK (single-hub airlines)

Used for: BAW, AFR, BEL

```
1. Load aircraft family config → get array of ICAO codes for family
2. Base = the airline's single hub
3. totalLegs must be even (enforced by UI for single-hub airlines)
4. Number of pairs = totalLegs / 2
5. Query DB for candidate outbound routes:
   - WHERE airlineIcao = airline
   - AND originIcao = base
   - AND aircraftIcao IN (family ICAO codes)
   - AND durationMinutes <= maxLegHours * 60
6. For each pair:
   a. Randomly select one outbound route
   b. Record the aircraft type from this outbound (e.g. "A320")
   c. Query for a return route:
      - WHERE airlineIcao = airline
      - AND originIcao = outbound.destinationIcao
      - AND destinationIcao = base
      - AND aircraftIcao IN (family ICAO codes)
   d. If return route found:
      - Use return route's flight number and data
      - Override aircraft type to match outbound (aircraft consistency)
   e. If NO return route found:
      - Generate flight number: outbound flight number ±1
      - Use same aircraft type as outbound
      - Estimate duration = outbound duration
      - Mark as isGenerated = true
7. If unable to build enough pairs, return error
8. Assemble flights in sequence
```

**Key rules for out-and-back:**
- Aircraft consistency within pairs: return leg ALWAYS uses same aircraft ICAO as outbound
- Aircraft can vary between pairs
- Flight numbers are real when possible, generated (±1) when no return data exists
- All flights originate/terminate at the single hub
- Number of legs must be even

---

### Mode B: CHAIN (multi-hub airlines)

Used for: DLH, AAL, UAL, DAL, FFT, EZY, RYR

```
1. Load aircraft family config → get array of ICAO codes for family
2. Load airline config → get hub list (hubSet)
3. Randomly select a starting hub → currentAirport = startingHub
4. For each leg (1 to totalLegs):
   a. Randomly decide: go to a HUB or go to an OUTSTATION
      - If currentAirport is an outstation → MUST go to a hub (no outstation→outstation)
      - If currentAirport is a hub → random choice
   b. Query DB for candidate routes:
      - WHERE airlineIcao = airline
      - AND originIcao = currentAirport
      - AND aircraftIcao IN (family ICAO codes)
      - AND durationMinutes <= maxLegHours * 60
      - If decision is "go to hub" → AND destinationIcao IN (hubSet)
      - If decision is "go to outstation" → AND destinationIcao NOT IN (hubSet)
   c. If candidates found:
      - Randomly select one route
      - Use the route's flight number, aircraft type, duration as-is (no aircraft override)
      - isGenerated = false
   d. If NO candidates found for the chosen destination type:
      - If was trying outstation → retry as hub-to-hub instead
      - If still no candidates → try any route from currentAirport within filters
      - If absolutely nothing → generate a fictional leg to a random hub:
        flight number = previous leg's number ±1, aircraft = random from family
        isGenerated = true
   e. currentAirport = selected route's destination
5. Assemble flights in sequence
```

**Key rules for chain mode:**
- Every leg must have at least one hub at either end (hub→hub, hub→outstation, or outstation→hub)
- Outstation→outstation is NEVER valid
- After landing at an outstation, the next leg MUST go to a hub
- No aircraft consistency enforcement — each leg uses whatever the data says
- Chain can end at any airport (doesn't need to loop back)
- Hubs can be revisited (no constraint on repeats)
- Number of legs can be odd or even
- The randomised choice between hub/outstation creates natural variety

**Constraint: at least one hub per leg (enforced in the algorithm):**

| Current airport | Can go to hub? | Can go to outstation? |
|----------------|----------------|----------------------|
| Hub | Yes | Yes (random choice) |
| Outstation | Yes (forced) | No |

---

## 6. API Routes

All API routes use Next.js App Router route handlers (`app/api/`).

### `POST /api/schedules/generate`
**Auth required**: Yes

**Request body:**
```json
{
  "airlineIcao": "DAL",
  "familyId": "a320",
  "maxLegHours": 4,
  "totalLegs": 6
}
```

**Validation:**
- `airlineIcao` must be in the airlines config
- `familyId` must be in the aircraft families config
- `maxLegHours` must be 1–18 (integer)
- `totalLegs` must be 1–8 (integer)
- For single-hub airlines, `totalLegs` must be even (enforced server-side, UI should also enforce)

**Response (success — chain mode example):**
```json
{
  "schedule": {
    "id": "clx...",
    "airline": "DAL",
    "family": "a320",
    "baseIcao": "KATL",
    "mode": "chain",
    "maxLegH": 4,
    "legs": 6,
    "createdAt": "2026-03-18T...",
    "flights": [
      {
        "sequence": 1,
        "flightNumber": "DL1234",
        "originIcao": "KATL",
        "destinationIcao": "KPHX",
        "aircraftIcao": "A321",
        "durationMinutes": 210,
        "isGenerated": false
      },
      {
        "sequence": 2,
        "flightNumber": "DL1235",
        "originIcao": "KPHX",
        "destinationIcao": "KJFK",
        "aircraftIcao": "A320",
        "durationMinutes": 275,
        "isGenerated": true
      },
      {
        "sequence": 3,
        "flightNumber": "DL567",
        "originIcao": "KJFK",
        "destinationIcao": "KAUS",
        "aircraftIcao": "A321",
        "durationMinutes": 230,
        "isGenerated": false
      },
      {
        "sequence": 4,
        "flightNumber": "DL568",
        "originIcao": "KAUS",
        "destinationIcao": "KATL",
        "aircraftIcao": "A319",
        "durationMinutes": 145,
        "isGenerated": true
      },
      {
        "sequence": 5,
        "flightNumber": "DL890",
        "originIcao": "KATL",
        "destinationIcao": "KMSP",
        "aircraftIcao": "A320",
        "durationMinutes": 155,
        "isGenerated": false
      },
      {
        "sequence": 6,
        "flightNumber": "DL445",
        "originIcao": "KMSP",
        "destinationIcao": "KLAX",
        "aircraftIcao": "A21N",
        "durationMinutes": 225,
        "isGenerated": false
      }
    ]
  }
}
```

**Response (success — out-and-back mode example):**
```json
{
  "schedule": {
    "id": "clx...",
    "airline": "BAW",
    "family": "a320",
    "baseIcao": "EGLL",
    "mode": "out-and-back",
    "maxLegH": 3,
    "legs": 4,
    "createdAt": "2026-03-18T...",
    "flights": [
      {
        "sequence": 1,
        "flightNumber": "BA100",
        "originIcao": "EGLL",
        "destinationIcao": "LFPG",
        "aircraftIcao": "A320",
        "durationMinutes": 75,
        "isGenerated": false
      },
      {
        "sequence": 2,
        "flightNumber": "BA101",
        "originIcao": "LFPG",
        "destinationIcao": "EGLL",
        "aircraftIcao": "A320",
        "durationMinutes": 80,
        "isGenerated": false
      },
      {
        "sequence": 3,
        "flightNumber": "BA200",
        "originIcao": "EGLL",
        "destinationIcao": "LEMD",
        "aircraftIcao": "A319",
        "durationMinutes": 145,
        "isGenerated": false
      },
      {
        "sequence": 4,
        "flightNumber": "BA201",
        "originIcao": "LEMD",
        "destinationIcao": "EGLL",
        "aircraftIcao": "A319",
        "durationMinutes": 150,
        "isGenerated": false
      }
    ]
  }
}
```

**Response (error — not enough routes):**
```json
{
  "error": "Not enough matching routes for these filters. Try a different airline, aircraft family, or increase the maximum leg duration."
}
```

### `GET /api/schedules`
**Auth required**: Yes

Returns all schedules for the authenticated user, ordered by `createdAt` desc. Includes nested flights.

### `GET /api/schedules/[id]`
**Auth required**: Yes

Returns a single schedule with flights. Must belong to the authenticated user.

### `DELETE /api/schedules/[id]`
**Auth required**: Yes

Deletes a schedule. Must belong to the authenticated user.

---

## 7. Page Structure

```
app/
├── page.tsx                    # Landing/marketing page (public)
├── login/page.tsx              # Login form
├── register/page.tsx           # Registration form
├── dashboard/
│   ├── page.tsx                # Main dashboard — schedule generator form + past schedules list
│   └── schedules/
│       └── [id]/page.tsx       # Individual schedule detail view
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── schedules/
│   │   ├── generate/route.ts
│   │   ├── route.ts            # GET all schedules
│   │   └── [id]/route.ts       # GET/DELETE single schedule
```

### Page Details

**Landing page (`/`)**: Brief description of CrewBoard, what it does, and a CTA to register or log in. Public, no auth required.

**Login (`/login`)**: Email and password form. Redirect to `/dashboard` on success.

**Register (`/register`)**: Email, password, optional name. Redirect to `/dashboard` on success.

**Dashboard (`/dashboard`)**: This is the main page. Two sections:
1. **Schedule Generator Form** — dropdowns/inputs for airline, aircraft family, max leg hours, number of legs. A "Generate Schedule" button. Shows the generated schedule in a table below the form. For single-hub airlines, the legs dropdown should only show even numbers (2, 4, 6, 8). For multi-hub airlines, all values 1–8 are valid.
2. **Past Schedules** — a list of previously generated schedules with date, airline, aircraft family, base, and mode. Click to view details.

**Schedule Detail (`/dashboard/schedules/[id]`)**: Full table view of a saved schedule with all flight details. Show the mode (out-and-back or chain) as a badge or label.

---

## 8. Implementation Slices

Each slice is a vertical, end-to-end, testable unit. Complete and test each slice before moving to the next.

### Slice 1: Project Scaffolding & Configuration
**Goal**: Bootable Next.js app with all dependencies, config files, and database connection.

**Tasks:**
- Initialize Next.js 14+ project with App Router, TypeScript, Tailwind v3
- Install dependencies: `next-auth@5`, `prisma`, `@prisma/client`, `bcryptjs`, `@types/bcryptjs`
- Set up Prisma with the full schema from Section 4
- Create `config/airlines.json` and `config/aircraft-families.json` with the data from Section 3.3 and 3.4
- Set up environment variables template (`.env.example`): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AEROAPI_KEY`
- Run `prisma db push` to create tables
- Create a basic root layout with Tailwind configured
- Verify: App starts, Prisma connects to Neon, config files load correctly

**Testable by**: Run `npm run dev`, see the default page, confirm no errors in console, confirm Prisma can connect.

---

### Slice 2: Authentication
**Goal**: Users can register, log in, and access protected routes.

**Tasks:**
- Configure NextAuth v5 with Credentials provider (email + password)
- Implement password hashing with bcryptjs
- Create registration API route that creates a User with hashed password
- Create login page (`/login`) with email/password form
- Create register page (`/register`) with email/password/name form
- Add auth middleware to protect `/dashboard` routes
- Create a basic dashboard page with a welcome message and logout button
- Create the landing page (`/`) with login/register links

**Testable by**: Register a new account, log in, see the dashboard, log out, confirm you can't access `/dashboard` without being logged in.

---

### Slice 3: Database Seed Script
**Goal**: Populate the routes table with real flight data from AeroAPI.

**Tasks:**
- Create `scripts/seed.ts` (or `scripts/seed.mjs`) that:
  - Reads airlines from `config/airlines.json`
  - Reads aircraft families from `config/aircraft-families.json`
  - For each airline, for each hub, queries AeroAPI:
    `GET /airports/{hub}/flights/scheduled_departures?airline={icao}&max_pages=3`
  - Filters results to only include aircraft types from configured families
  - Extracts unique routes (airline + flight number + origin + destination + aircraft type)
  - Upserts into the Route table
  - Handles pagination and rate limiting (delay between requests)
  - Logs progress to console
- Add a `seed` script to `package.json`
- Document the seed process in README

**Testable by**: Run the seed script with a valid AeroAPI key, verify routes appear in the database, spot-check routes against FlightAware's website. Verify both hub→hub and hub→outstation routes exist.

**Note**: This slice requires an AeroAPI key. The personal tier (free, 500 calls/month) is sufficient. ~153 billable pages per seed run.

---

### Slice 4: Schedule Generation Engine
**Goal**: The core dual-mode algorithm that generates schedules from cached data.

**Tasks:**
- Implement `lib/schedule-generator.ts` with both modes (Section 5):
  - Mode detection (single hub → out-and-back, multi hub → chain)
  - Out-and-back algorithm with aircraft consistency
  - Chain algorithm with hub/outstation rules
  - Generated flight number logic (±1) for missing return routes
- Implement `POST /api/schedules/generate` route handler
- Implement `GET /api/schedules` route handler (list user's schedules)
- Implement `GET /api/schedules/[id]` route handler
- Implement `DELETE /api/schedules/[id]` route handler
- Add input validation (even legs for single-hub airlines, etc.)
- Handle error cases (not enough routes)

**Testable by**: Use a REST client to call the generate endpoint. Test both modes:
- Single-hub airline (BAW) → verify out-and-back pairs with aircraft consistency
- Multi-hub airline (DAL) → verify chain respects hub/outstation rules (no outstation→outstation)
- Test edge cases: filters with no matches, odd legs for multi-hub, even legs enforced for single-hub

---

### Slice 5: Schedule Generator UI
**Goal**: The dashboard form for generating schedules and viewing results.

**Tasks:**
- Build the schedule generator form on `/dashboard`:
  - Airline dropdown (from config)
  - Aircraft family dropdown (from config)
  - Max leg duration selector (1h–18h)
  - Number of legs selector (dynamically: even only for single-hub airlines, 1–8 for multi-hub)
  - "Generate Schedule" button with loading state
- Display the generated schedule in a table:
  - Columns: Seq, Flight No, From (ICAO), To (ICAO), Aircraft, Block Time
  - Show mode badge (out-and-back / chain)
  - Show starting hub
  - Flag generated legs visually (subtle indicator for isGenerated flights)
  - ICAO codes and flight numbers in monospace font
- "Regenerate" button to generate a new schedule with same parameters
- Error state display when no matching routes found

**Testable by**: Log in, generate schedules for various airlines. Verify single-hub airlines produce out-and-back pairs. Verify multi-hub airlines produce chains with valid hub/outstation patterns. Try failing filters.

---

### Slice 6: Past Schedules & Schedule Detail
**Goal**: Users can view and manage their saved schedules.

**Tasks:**
- Build the past schedules list on `/dashboard` (below generator):
  - Show: date, airline name, aircraft family, base, mode badge, leg count
  - Click to navigate to detail view
  - Delete button with confirmation
- Build the schedule detail page (`/dashboard/schedules/[id]`):
  - Full flight table (same format as generation result)
  - Schedule metadata (airline, family, base, mode, date)
  - Back to dashboard link
  - Delete button
- Handle unauthorised access (schedule belongs to another user → 404)

**Testable by**: Generate several schedules, view them in list, click into details, delete one, confirm it's gone.

---

## 9. Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="generate-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# AeroAPI (needed for seeding — both local and Vercel cron)
AEROAPI_KEY="your-flightaware-aeroapi-key"
```

---

## 10. Deployment Notes

### Vercel
- Connect the GitHub repo to Vercel
- Set environment variables in Vercel dashboard (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, AEROAPI_KEY)
- Enable Fluid Compute in project settings (needed for cron seeding)
- Prisma generates the client at build time — ensure `prisma generate` runs in the build command

### Neon
- Create a Neon project and database
- Use the connection string (with `?sslmode=require`) as DATABASE_URL
- Run `prisma db push` locally to create tables before first deployment

### Build Command
```bash
prisma generate && next build
```

---

## 11. Future Considerations (Not MVP)

These are noted for context but should NOT be built in the MVP:

- User-selectable starting hub
- User toggle for out-and-back vs chain mode
- Flight completion tracking / logbook
- SimBrief integration for OFP generation
- Route map visualization
- More airlines and aircraft families
- Career mode / progression
- Schedule sharing between users
- Turnaround time configuration between legs
- Crew rest / fatigue rules
- VATSIM/IVAO integration
- Mobile-responsive tracker companion
