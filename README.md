# CrewBoard

Realistic flight schedule generator for flight simulator pilots. Pick an airline, choose an aircraft family, set your preferences, and get an operationally consistent multi-leg schedule built from real-world route data.

**Key feature:** Aircraft type is enforced consistent within each out-and-back pair — if the outbound leg uses an A320, the return does too. This mirrors real airline operations while giving you the freedom to pick any airline and aircraft family.

---

## Features

- Schedules generated from cached real flight data (FlightAware AeroAPI)
- Two generation modes auto-selected by airline:
  - **Out-and-back** — paired legs from a single hub, consistent aircraft per pair (e.g. British Airways, Air France)
  - **Chain** — sequential routing across multiple hubs, go wherever the network takes you (e.g. Delta, United, easyJet)
- Draft preview before saving — generate as many times as you like, save the one you want
- Full schedule history per user
- 10 airlines across A320, A330, and 777 families

## Tech Stack

- **Next.js 16** — App Router, TypeScript, server components
- **Tailwind CSS v3**
- **NextAuth v5** — email/password authentication
- **Prisma v5** + **Neon PostgreSQL**
- Deployed on **Vercel**

---

## Getting Started

### Prerequisites

- Node.js 22+
- A [Neon](https://neon.tech) PostgreSQL database (free tier is sufficient)
- A [FlightAware AeroAPI](https://www.flightaware.com/commercial/aeroapi/) key for seeding (personal tier, free, 500 calls/month)

### 1. Clone and install

```bash
git clone https://github.com/your-username/crewboard.git
cd crewboard
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://..."   # Neon connection string (include ?sslmode=require)
AUTH_SECRET="..."                  # Random secret: openssl rand -base64 32
AUTH_URL="http://localhost:3000"
AEROAPI_KEY="..."                  # Only needed for seeding
```

### 3. Set up the database

```bash
npx prisma db push
```

### 4. Seed route data

```bash
# Seed all airlines (~200 API calls, uses ~40% of personal tier monthly budget)
npm run seed

# Or seed one airline at a time to conserve API calls
npm run seed BAW   # British Airways
npm run seed DLH   # Lufthansa
npm run seed DAL   # Delta
```

Supported airline codes: `DLH`, `AFR`, `BEL`, `BAW`, `AAL`, `UAL`, `DAL`, `FFT`, `EZY`, `RYR`

> The seed script fetches flights from each airline's hub airports (departures + arrivals) over the past 24 hours and stores unique routes in the database. It's safe to re-run — each airline's routes are replaced atomically. Rate-limit retries use exponential backoff.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

### Schedule Generation

The generator reads from the cached `Route` table (populated by the seed script) — no live API calls at runtime.

**Out-and-back mode** (single-hub airlines: BAW, AFR, BEL):
- Randomly selects outbound routes from the hub within your max leg duration
- Finds a matching return route, enforcing the same aircraft type within each pair
- If no real return route exists, generates a plausible fictional leg (marked `est.`)

**Chain mode** (multi-hub airlines: DLH, AAL, UAL, DAL, FFT, EZY, RYR):
- Starts at a randomly selected hub
- Each leg departs from wherever the previous leg landed
- If stuck at an outstation with no routes, generates a fictional leg back to a hub

### Adding Airlines or Aircraft Families

Edit `config/airlines.json` or `config/aircraft-families.json` — no code changes required. Re-run the seed script for any new airlines.

---

## Deployment

### Vercel

1. Push to GitHub and connect the repo in Vercel
2. Add environment variables in the Vercel dashboard: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
   - `AEROAPI_KEY` is **not** needed in Vercel — seeding is run locally
3. The build command (`prisma generate && next build`) is already configured in `package.json`

### Database

Run `npx prisma db push` locally before the first deployment to ensure the schema is in sync. Neon's free tier handles the traffic of a personal project comfortably.

---

## Project Structure

```
app/                    Next.js App Router pages and API routes
components/             Shared UI components (ScheduleTable)
config/                 Airlines and aircraft families JSON config
lib/                    Prisma client, schedule generation algorithm
scripts/                AeroAPI seed script
prisma/                 Database schema
```

See [`CLAUDE.md`](./CLAUDE.md) for a full architecture reference intended for AI-assisted development.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
