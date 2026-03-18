# CrewBoard — Schedule Generation Algorithm Brief

> The complete specification for generating flight schedules. This is the core logic of CrewBoard and should be implemented in `lib/schedule-generator.ts`.

---

## 1. Overview

The schedule generator takes user inputs (airline, aircraft family, max leg duration, number of legs) and produces a realistic sequence of flights by querying the cached route database. It operates in one of two modes, auto-detected based on the airline's hub count.

| Hubs | Mode | Description |
|------|------|-------------|
| 1 | Out-and-back | Paired flights from a single base with aircraft consistency |
| 2+ | Chain | Sequential flights from wherever you are — just find the next route |

---

## 2. Inputs & Validation

### Function Signature

```typescript
interface GenerateScheduleInput {
  airlineIcao: string;   // e.g. "DAL"
  familyId: string;      // e.g. "a320"
  maxLegHours: number;   // e.g. 4
  totalLegs: number;     // e.g. 6
}

interface GeneratedSchedule {
  airline: string;
  family: string;
  baseIcao: string;
  mode: "out-and-back" | "chain";
  maxLegH: number;
  legs: number;
  flights: GeneratedFlight[];
}

interface GeneratedFlight {
  sequence: number;
  flightNumber: string;
  originIcao: string;
  destinationIcao: string;
  aircraftIcao: string;
  durationMinutes: number;
  isGenerated: boolean;
}
```

### Validation Rules

| Field | Constraint | Error message |
|-------|-----------|---------------|
| `airlineIcao` | Must exist in `config/airlines.json` | "Unknown airline code" |
| `familyId` | Must exist in `config/aircraft-families.json` | "Unknown aircraft family" |
| `maxLegHours` | Integer, 1–18 | "Max leg duration must be between 1 and 18 hours" |
| `totalLegs` | Integer, 1–8 | "Number of legs must be between 1 and 8" |
| `totalLegs` | Must be even IF airline has exactly 1 hub | "Single-hub airlines require an even number of legs" |

Validate all inputs before any database queries. Return a clear error for each violation.

---

## 3. Shared Setup (Both Modes)

```
FUNCTION generateSchedule(input):

  // 1. Load configs
  airline = loadAirlineConfig(input.airlineIcao)
  family = loadFamilyConfig(input.familyId)

  // airline.hubs = ["KATL", "KJFK", "KMSP", ...]
  // family.icao_codes = ["A318", "A319", "A320", "A321", "A20N", "A21N"]

  hubSet = Set(airline.hubs)
  familyCodes = family.icao_codes
  maxDurationMinutes = input.maxLegHours * 60

  // 2. Detect mode
  IF hubSet.size === 1:
    mode = "out-and-back"
    baseIcao = airline.hubs[0]
  ELSE:
    mode = "chain"
    baseIcao = randomChoice(airline.hubs)

  // 3. Branch to mode-specific algorithm
  IF mode === "out-and-back":
    flights = generateOutAndBack(...)
  ELSE:
    flights = generateChain(...)

  RETURN { airline, family, baseIcao, mode, flights, ... }
```

---

## 4. Mode A: Out-and-Back (Single-Hub Airlines)

### Airlines Using This Mode
BAW (EGLL), AFR (LFPG), BEL (EBBR)

### Concept
Paired flights: outbound from hub, return to hub. Each pair uses the same aircraft type. Between pairs, the aircraft can change.

### Visual Pattern
```
Hub ──→ Dest A ──→ Hub ──→ Dest B ──→ Hub
     pair 1 (A320)      pair 2 (A319)
```

### Pseudo Code

```
FUNCTION generateOutAndBack(input, airline, familyCodes, maxDurationMinutes, baseIcao):

  numberOfPairs = input.totalLegs / 2
  flights = []
  sequence = 1

  // Query all candidate outbound routes from the base
  outboundCandidates = queryRoutes(
    airlineIcao = airline.icao,
    originIcao = baseIcao,
    aircraftIcao IN familyCodes,
    durationMinutes <= maxDurationMinutes
  )

  IF outboundCandidates.length === 0:
    THROW "Not enough matching routes for these filters"

  // Track used destinations to prefer variety (soft constraint)
  usedDestinations = Set()

  FOR i = 0 TO numberOfPairs - 1:

    // --- SELECT OUTBOUND ---

    // Prefer destinations not yet used, but allow repeats if necessary
    unusedCandidates = outboundCandidates.filter(r => NOT usedDestinations.has(r.destinationIcao))
    pool = unusedCandidates.length > 0 ? unusedCandidates : outboundCandidates

    outboundRoute = randomChoice(pool)
    outboundAircraft = outboundRoute.aircraftIcao
    usedDestinations.add(outboundRoute.destinationIcao)

    // Add outbound flight
    flights.push({
      sequence: sequence++,
      flightNumber: outboundRoute.flightNumber,
      originIcao: baseIcao,
      destinationIcao: outboundRoute.destinationIcao,
      aircraftIcao: outboundAircraft,
      durationMinutes: outboundRoute.durationMinutes,
      isGenerated: false
    })

    // --- SELECT RETURN ---

    // Try to find a real return route within the aircraft family
    returnCandidates = queryRoutes(
      airlineIcao = airline.icao,
      originIcao = outboundRoute.destinationIcao,
      destinationIcao = baseIcao,
      aircraftIcao IN familyCodes
    )

    IF returnCandidates.length > 0:
      returnRoute = randomChoice(returnCandidates)
      flights.push({
        sequence: sequence++,
        flightNumber: returnRoute.flightNumber,
        originIcao: outboundRoute.destinationIcao,
        destinationIcao: baseIcao,
        aircraftIcao: outboundAircraft,    // ← OVERRIDE: use outbound aircraft
        durationMinutes: returnRoute.durationMinutes,
        isGenerated: false
      })
    ELSE:
      // No real return route — generate a fictional one
      flights.push({
        sequence: sequence++,
        flightNumber: generateReturnFlightNumber(outboundRoute.flightNumber),
        originIcao: outboundRoute.destinationIcao,
        destinationIcao: baseIcao,
        aircraftIcao: outboundAircraft,    // ← Same aircraft as outbound
        durationMinutes: outboundRoute.durationMinutes,  // ← Estimate same duration
        isGenerated: true
      })

  RETURN flights
```

### Constraints — Out-and-Back

| Constraint | Rule |
|-----------|------|
| Aircraft consistency | Return leg MUST use same `aircraftIcao` as its outbound leg |
| Aircraft between pairs | CAN differ (each pair independently picks from family) |
| Flight numbers | Real from DB when possible. Generated (±1) when no return exists |
| Origin/destination | Every outbound from base, every return to base |
| Legs count | Must be even (2, 4, 6, 8) |
| Destination variety | Soft preference — avoid repeats, allow if pool is small |

---

## 5. Mode B: Chain (Multi-Hub Airlines)

### Airlines Using This Mode
DLH (2 hubs), AAL (7), UAL (7), DAL (8), FFT (10), EZY (10), RYR (4)

### Concept
Start at a random hub. Each leg departs from wherever the previous leg landed. Just query the DB for any matching route from the current airport. The mix of hub-to-hub, hub-to-outstation, and outstation-to-hub legs emerges naturally from the data — no special logic needed.

### Why This Works
The seeder stores routes captured from both departures AND arrivals at each hub. So the DB contains:
- Hub → Hub routes (captured as departures from hub A and arrivals at hub B)
- Hub → Outstation routes (captured as departures from hub)
- Outstation → Hub routes (captured as arrivals at hub)

When the chain lands at an outstation, there will typically be outstation→hub routes in the DB (they were recorded as arrivals at various hubs during seeding). The algorithm doesn't need to know or care whether the current airport is a hub or outstation — it just looks for routes.

### Visual Pattern
```
Hub A ──→ Outstation X ──→ Hub B ──→ Hub C ──→ Outstation Y ──→ Hub A
```

### Pseudo Code

```
FUNCTION generateChain(input, airline, familyCodes, maxDurationMinutes, baseIcao, hubSet):

  flights = []
  currentAirport = baseIcao

  FOR leg = 1 TO input.totalLegs:

    // --- FIND A ROUTE FROM CURRENT AIRPORT ---

    candidates = queryRoutes(
      airlineIcao = airline.icao,
      originIcao = currentAirport,
      aircraftIcao IN familyCodes,
      durationMinutes <= maxDurationMinutes
    )

    IF candidates.length > 0:
      // Pick a random route
      selectedRoute = randomChoice(candidates)

      flights.push({
        sequence: leg,
        flightNumber: selectedRoute.flightNumber,
        originIcao: currentAirport,
        destinationIcao: selectedRoute.destinationIcao,
        aircraftIcao: selectedRoute.aircraftIcao,
        durationMinutes: selectedRoute.durationMinutes,
        isGenerated: false
      })

      currentAirport = selectedRoute.destinationIcao

    ELSE:
      // --- NO ROUTES FOUND — GENERATE FICTIONAL LEG ---

      // Determine where to go: pick a random hub to get back into the network
      targetHub = randomChoice(Array.from(hubSet))

      // Determine flight number
      IF flights.length > 0:
        prevFlightNumber = flights[flights.length - 1].flightNumber
        flightNumber = generateReturnFlightNumber(prevFlightNumber)
      ELSE:
        flightNumber = airline.icao + String(randomInt(1000, 9999))

      // Determine aircraft
      aircraftIcao = randomChoice(familyCodes)

      // Estimate duration
      durationMinutes = estimateDuration(currentAirport, targetHub)

      flights.push({
        sequence: leg,
        flightNumber: flightNumber,
        originIcao: currentAirport,
        destinationIcao: targetHub,
        aircraftIcao: aircraftIcao,
        durationMinutes: durationMinutes,
        isGenerated: true
      })

      currentAirport = targetHub

  RETURN flights
```

### Constraints — Chain

| Constraint | Rule |
|-----------|------|
| Route selection | Pick ANY matching route from current airport. No hub/outstation logic. |
| Aircraft consistency | NONE. Each leg uses whatever the data says. |
| Starting airport | Randomly selected from airline's hubs |
| Ending airport | Wherever the chain ends. No loop-back required. |
| Hub revisits | Allowed. No constraint on visiting the same airport multiple times. |
| Legs count | 1–8, odd or even. |
| Missing routes (stuck) | Generate fictional leg to a random hub. Mark `isGenerated = true`. |
| Data dependency | Algorithm relies on the seeder having captured both departures and arrivals at each hub. Arrivals provide outstation→hub return routes. |

---

## 6. Helper Functions

### queryRoutes

Database query wrapper. Builds a Prisma `findMany` with dynamic filters.

```
FUNCTION queryRoutes(params):
  where = { airlineIcao: params.airlineIcao }

  IF params.originIcao:
    where.originIcao = params.originIcao
  IF params.destinationIcao:
    where.destinationIcao = params.destinationIcao
  IF params.aircraftIn:
    where.aircraftIcao = { in: params.aircraftIn }
  IF params.maxDuration:
    where.durationMinutes = { lte: params.maxDuration }

  RETURN prisma.route.findMany({ where })
```

### generateReturnFlightNumber

Creates a plausible return flight number by incrementing the numeric portion.

```
FUNCTION generateReturnFlightNumber(flightNumber):
  // "DL1234" → "DL1235"
  // "LH108"  → "LH109"

  prefix = flightNumber.match(/^[A-Z]+/)[0]    // "DL"
  number = parseInt(flightNumber.match(/\d+/)[0]) // 1234

  RETURN prefix + String(number + 1)             // "DL1235"
```

### estimateDuration

Fallback duration when generating fictional legs.

```
FUNCTION estimateDuration(originIcao, destinationIcao):
  // Try to find any existing route between these airports in the DB
  existing = prisma.route.findFirst({
    where: { originIcao, destinationIcao }
  })

  IF existing:
    RETURN existing.durationMinutes

  // Try reverse direction
  reverse = prisma.route.findFirst({
    where: { originIcao: destinationIcao, destinationIcao: originIcao }
  })

  IF reverse:
    RETURN reverse.durationMinutes

  // Default: 120 minutes
  RETURN 120
```

### randomChoice / randomInt

```
FUNCTION randomChoice(array):
  RETURN array[Math.floor(Math.random() * array.length)]

FUNCTION randomInt(min, max):
  RETURN Math.floor(Math.random() * (max - min + 1)) + min
```

---

## 7. Database Query Patterns

### Indexes Required

```prisma
@@index([airlineIcao, originIcao, aircraftIcao])        // primary lookup
@@index([airlineIcao, destinationIcao, aircraftIcao])    // return route lookup
@@index([airlineIcao, originIcao, destinationIcao])      // specific route pair
```

### Key Queries

**Out-and-back — outbound routes from base:**
```sql
SELECT * FROM "Route"
WHERE "airlineIcao" = 'BAW'
  AND "originIcao" = 'EGLL'
  AND "aircraftIcao" IN ('A318','A319','A320','A321','A20N','A21N')
  AND "durationMinutes" <= 180
```

**Out-and-back — return route:**
```sql
SELECT * FROM "Route"
WHERE "airlineIcao" = 'BAW'
  AND "originIcao" = 'LFPG'
  AND "destinationIcao" = 'EGLL'
  AND "aircraftIcao" IN ('A318','A319','A320','A321','A20N','A21N')
```

**Chain — any route from current airport:**
```sql
SELECT * FROM "Route"
WHERE "airlineIcao" = 'DAL'
  AND "originIcao" = 'KCVG'
  AND "aircraftIcao" IN ('A318','A319','A320','A321','A20N','A21N')
  AND "durationMinutes" <= 240
```

That's it for chain mode. One query per leg. Simple.

---

## 8. Worked Examples

### Example 1: British Airways, A320 Family, Max 3h, 4 Legs

**Mode**: Out-and-back (1 hub: EGLL)

```
Setup:
  base = EGLL
  familyCodes = [A318, A319, A320, A321, A20N, A21N]
  maxDuration = 180 min
  pairs = 2

Pair 1:
  Query outbound from EGLL, family, ≤180min → [LFPG, EHAM, LEMD, EDDM, ...]
  Random pick: LFPG (BA304, A320, 75min)
  Query return LFPG → EGLL, family → found: BA305, A319, 80min
  Override return aircraft: A319 → A320 (match outbound)

  Leg 1: BA304  EGLL → LFPG  A320  75min   isGenerated=false
  Leg 2: BA305  LFPG → EGLL  A320  80min   isGenerated=false

Pair 2:
  Prefer unused destination. Pick LEMD (BA456, A319, 145min)
  Query return LEMD → EGLL, family → found: BA457, A321, 150min
  Override return aircraft: A321 → A319 (match outbound)

  Leg 3: BA456  EGLL → LEMD  A319  145min  isGenerated=false
  Leg 4: BA457  LEMD → EGLL  A319  150min  isGenerated=false
```

### Example 2: Delta, A320 Family, Max 4h, 6 Legs

**Mode**: Chain (8 hubs)

```
Setup:
  startingHub = KATL (random)
  currentAirport = KATL

Leg 1: Query routes from KATL, DAL, family, ≤240min
  Candidates: [KJFK, KBOS, KMSP, KPHX, KAUS, KCVG, KORD, ...]
  Random pick: KPHX (DL1842, A321, 210min)
  Leg 1: DL1842  KATL → KPHX  A321  210min  isGenerated=false
  currentAirport = KPHX

Leg 2: Query routes from KPHX, DAL, family, ≤240min
  DB has KPHX→KATL, KPHX→KSLC, KPHX→KLAX (captured as arrivals at those hubs)
  Random pick: KSLC (DL1901, A320, 130min)
  Leg 2: DL1901  KPHX → KSLC  A320  130min  isGenerated=false
  currentAirport = KSLC

Leg 3: Query routes from KSLC, DAL, family, ≤240min
  Candidates: [KATL, KLAX, KMSP, KSEA, KBOI, ...]
  Random pick: KMSP (DL2103, A319, 175min)
  Leg 3: DL2103  KSLC → KMSP  A319  175min  isGenerated=false
  currentAirport = KMSP

Leg 4: Query routes from KMSP, DAL, family, ≤240min
  Candidates: [KATL, KDTW, KBOS, KLAX, KAUS, ...]
  Random pick: KAUS (DL778, A321, 185min)
  Leg 4: DL778   KMSP → KAUS  A321  185min  isGenerated=false
  currentAirport = KAUS

Leg 5: Query routes from KAUS, DAL, family, ≤240min
  DB has KAUS→KATL (captured as arrival at KATL during seeding)
  Only candidate: KATL
  Leg 5: DL779   KAUS → KATL  A321  160min  isGenerated=false
  currentAirport = KATL

Leg 6: Query routes from KATL, DAL, family, ≤240min
  Lots of candidates again
  Random pick: KLAX (DL510, A21N, 240min)
  Leg 6: DL510   KATL → KLAX  A21N  240min  isGenerated=false
  currentAirport = KLAX

DONE — 6 legs. Ends at KLAX.
```

### Example 3: Delta, A320 Family — Fictional Leg Needed

```
Continuing from a previous leg that landed at a small outstation...

Leg 4: currentAirport = KGRR (Grand Rapids — outstation)
  Query routes from KGRR, DAL, family, ≤240min
  → No results! KGRR wasn't captured in any hub's arrivals data.

  FALLBACK: Generate fictional leg to random hub
  Target hub: KDTW (random from DAL hubs — conveniently close to Grand Rapids)
  Flight number: DL779 (previous leg was DL778, so +1)
  Aircraft: A320 (random from family)
  Duration: estimateDuration(KGRR, KDTW) → check DB... no data → default 120min

  Leg 4: DL779   KGRR → KDTW  A320  120min  isGenerated=true
  currentAirport = KDTW

Leg 5: Back at a hub, normal operation resumes...
```

### Example 4: Lufthansa, A320 Family, Max 2h, 3 Legs

**Mode**: Chain (2 hubs: EDDF, EDDM)

```
Setup:
  startingHub = EDDM (random)
  currentAirport = EDDM

Leg 1: Query routes from EDDM, DLH, family, ≤120min
  Candidates: [EDDF, EDDH, EDDL, EDDT, EHAM, ...]
  Random pick: EDDF (LH108, A320, 55min)
  Leg 1: LH108   EDDM → EDDF  A320  55min   isGenerated=false
  currentAirport = EDDF

Leg 2: Query routes from EDDF, DLH, family, ≤120min
  Candidates: [EDDM, EDDH, EDDL, EDDT, EHAM, LFPG, EBBR, ...]
  Random pick: EHAM (LH990, A319, 75min)
  Leg 2: LH990   EDDF → EHAM  A319  75min   isGenerated=false
  currentAirport = EHAM

Leg 3: Query routes from EHAM, DLH, family, ≤120min
  DB has EHAM→EDDF, EHAM→EDDM (captured as arrivals at FRA and MUC)
  Random pick: EDDF (LH991, A319, 70min)
  Leg 3: LH991   EHAM → EDDF  A319  70min   isGenerated=false
  currentAirport = EDDF

DONE — 3 legs. Ends at EDDF.
```

---

## 9. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| No routes match filters at all | Return error: "Not enough matching routes for these filters" |
| At outstation with no routes in DB | Generate fictional leg to random hub, `isGenerated = true` |
| Aircraft family not operated by airline | Return error (no routes will match) |
| `totalLegs = 1` for single-hub airline | Validation error: "Single-hub airlines require an even number of legs" |
| `totalLegs = 1` for multi-hub airline | Valid — single leg from starting hub |
| All outbound destinations already used (O&B) | Allow repeats — pool falls back to full candidate list |
| Duration too short for any routes | Return error with suggestion to increase duration |
| Database empty (not seeded) | Return error: "No route data available. Please run the seed script" |
| Generated flight number collides with real one | Acceptable — cosmetic only |
| Chain leg 1 has no candidates from starting hub | Return error (extremely unlikely but possible) |

### No Retry Logic
The algorithm does NOT retry the entire schedule on partial failure. If stuck (no candidates and can't generate fictional), it throws an error. The user regenerates with different parameters. Simple and predictable.

---

## 10. Testing Checklist

### Unit Tests

| Test | Mode | Expected |
|------|------|----------|
| Single-hub, 4 legs → 2 pairs with matching aircraft | O&B | Legs 1&2 same aircraft, legs 3&4 same aircraft |
| Single-hub, odd legs → validation error | O&B | Error before DB query |
| Multi-hub, 1 leg → single flight from random hub | Chain | One valid flight |
| Multi-hub, 6 legs → valid chain | Chain | Each leg departs from previous leg's destination |
| No outstation→outstation without hub data | Chain | If origin has no routes, fictional leg to hub is generated |
| Generated flight when no return exists | O&B | `isGenerated = true`, flight number is +1 from outbound |
| Generated flight when stuck at outstation | Chain | `isGenerated = true`, destination is a hub |
| Empty database → clear error | Both | Error mentions seeding |
| Duration filter respected | Both | No real flight exceeds max (generated legs may estimate) |
| Aircraft family filter respected | Both | Every real flight's aircraft is in family's ICAO codes |
| Consecutive legs are connected | Chain | Flight N's destination === Flight N+1's origin |

### Integration Tests

| Test | Expected |
|------|----------|
| Generate BAW A320 4 legs | All flights touch EGLL, aircraft consistent within pairs |
| Generate DAL A320 6 legs | Chain of connected flights, each departs from previous destination |
| Generate with impossible filters (RYR + B777) | Error returned |
| Regenerate same params twice | Different schedules (randomisation) |
| Save and retrieve schedule | All flights persisted and returned correctly |
