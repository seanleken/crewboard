/**
 * CrewBoard seed script
 * Fetches flight data from FlightAware AeroAPI and populates the Route table.
 *
 * Strategy: for each airline, query each of its hubs via /airports/{hub}/flights
 * filtered by airline ICAO. This ensures balanced route coverage across all hubs
 * rather than skewing towards the busiest hub.
 *
 * Usage:
 *   npm run seed [AIRLINE_ICAO]
 *
 * Requires AEROAPI_KEY in .env
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import airlinesConfig from '../config/airlines.json'
import familiesConfig from '../config/aircraft-families.json'
import fs from 'fs'

const prisma = new PrismaClient()

const AEROAPI_BASE = 'https://aeroapi.flightaware.com/aeroapi'
const TARGET_PAGES_PER_AIRLINE = 1000 // total API calls budget per airline, split across hubs
const DELAY_BETWEEN_PAGES_MS = 1000
const DELAY_BETWEEN_HUBS_MS = 1500
const DELAY_BETWEEN_AIRLINES_MS = 2000

function pagesPerHub(hubCount: number): number {
  return Math.max(1, Math.ceil(TARGET_PAGES_PER_AIRLINE / hubCount))
}

const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(today.getDate() - 1)
const todayISODate = today.toISOString().split('T')[0]
const yesterdayISODate = yesterday.toISOString().split('T')[0]

// All ICAO aircraft codes from configured families
const knownAircraftCodes = new Set(
  familiesConfig.families.flatMap((f) => f.icao_codes)
)

interface AeroFlight {
  ident: string
  origin: { code_icao: string | null } | null
  destination: { code_icao: string | null } | null
  aircraft_type: string | null
  scheduled_out: string | null
  scheduled_in: string | null
  filed_ete: number | null // seconds
}

interface AeroResponse {
  scheduled_departures: AeroFlight[]
  scheduled_arrivals: AeroFlight[]
  departures: AeroFlight[]
  arrivals: AeroFlight[]
  links?: { next?: string }
}

const MAX_RETRIES = 4
const RETRY_BASE_MS = 10000 // 10s, 20s, 40s, 80s

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jitter(ms: number) {
  // ±20% random jitter to avoid thundering herd
  return ms + Math.floor((Math.random() - 0.5) * 0.4 * ms)
}

async function fetchPage(path: string): Promise<AeroResponse> {
  const apiKey = process.env.AEROAPI_KEY
  if (!apiKey) throw new Error('AEROAPI_KEY is not set in environment')

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${AEROAPI_BASE}${path}`, {
      headers: { 'x-apikey': apiKey },
    })

    if (res.status === 429) {
      if (attempt === MAX_RETRIES) throw new Error('AeroAPI rate limit hit — max retries exceeded')

      // Honour Retry-After header if present (value is seconds)
      const retryAfter = res.headers.get('Retry-After')
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : jitter(RETRY_BASE_MS * 2 ** attempt)

      console.warn(`\n   Rate limited. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}...`)
      await sleep(waitMs)
      continue
    }

    if (!res.ok) {
      console.error(`error - {${JSON.stringify(res)}}`)
      const body = await res.text()
      throw new Error(`AeroAPI ${res.status}: ${body}`)
    }

    return res.json() as Promise<AeroResponse>
  }

  throw new Error('fetchPage: exhausted retries')
}

function durationMinutes(flight: AeroFlight): number | null {
  // Prefer filed_ete (estimated time en route, in seconds)
  if (flight.filed_ete && flight.filed_ete > 0) {
    return Math.round(flight.filed_ete / 60)
  }
  // Fall back to scheduled times
  if (flight.scheduled_out && flight.scheduled_in) {
    const out = new Date(flight.scheduled_out).getTime()
    const inn = new Date(flight.scheduled_in).getTime()
    const diff = Math.round((inn - out) / 60000)
    if (diff > 0 && diff < 1440) return diff // sanity: between 0 and 24h
  }
  return null
}

interface RouteRecord {
  airlineIcao: string
  flightNumber: string
  originIcao: string
  destinationIcao: string
  aircraftIcao: string
  durationMinutes: number
}

async function seedHub(
  hubIcao: string,
  airlineIcao: string,
  maxPages: number,
  routes: Map<string, RouteRecord>
) {
  console.log(`   Hub ${hubIcao} (max ${maxPages} page${maxPages === 1 ? '' : 's'})`)

  let nextPath: string | null =
    `/airports/${hubIcao}/flights?airline=${airlineIcao}&max_pages=1&start=${yesterdayISODate}&end=${todayISODate}`
  let page = 0

  while (nextPath && page < maxPages) {
    page++
    process.stdout.write(`      Page ${page}... `)

    let data: AeroResponse
    try {
      data = await fetchPage(nextPath)
    } catch (err) {
      console.error(`\n      Error on page ${page}:`, (err as Error).message)
      break
    }

    const flights = [
      ...(data.scheduled_departures ?? []),
      ...(data.scheduled_arrivals ?? []),
      ...(data.departures ?? []),
      ...(data.arrivals ?? []),
    ]

    let kept = 0
    for (const flight of flights) {
      const aircraftIcao = flight.aircraft_type?.toUpperCase().trim()
      if (!aircraftIcao || !knownAircraftCodes.has(aircraftIcao)) continue

      const originIcao = flight.origin?.code_icao
      const destinationIcao = flight.destination?.code_icao
      if (!originIcao || !destinationIcao) continue

      const flightNumber = flight.ident?.trim()
      if (!flightNumber) continue

      const duration = durationMinutes(flight)
      if (!duration) continue

      const key = `${airlineIcao}|${flightNumber}|${originIcao}|${destinationIcao}|${aircraftIcao}`
      if (!routes.has(key)) {
        routes.set(key, {
          airlineIcao,
          flightNumber,
          originIcao,
          destinationIcao,
          aircraftIcao,
          durationMinutes: duration,
        })
        kept++
      }
    }

    console.log(`${flights.length} flights, ${kept} new routes (total: ${routes.size})`)

    nextPath = data.links?.next ?? null
    if (nextPath && page < maxPages) {
      await sleep(DELAY_BETWEEN_PAGES_MS)
    } else {
      break
    }
  }
}

async function seedAirline(
  airlineIcao: string,
  airlineName: string,
  hubs: string[]
) {
  const maxPages = pagesPerHub(hubs.length)
  console.log(`\n✈  ${airlineName} (${airlineIcao}) — ${hubs.length} hub(s), ${maxPages} page(s)/hub (~${maxPages * hubs.length} API calls)`)

  const routes = new Map<string, RouteRecord>()

  for (const hub of hubs) {
    await seedHub(hub, airlineIcao, maxPages, routes)
    await sleep(DELAY_BETWEEN_HUBS_MS)
  }

  if (routes.size === 0) {
    console.log(`   No matching routes found — skipping database write`)
    return
  }

  await prisma.$transaction([
    prisma.route.deleteMany({ where: { airlineIcao } }),
    prisma.route.createMany({ data: Array.from(routes.values()) }),
  ])

  console.log(`   ✓ Done`)
}

async function main() {
  console.log('CrewBoard seed script')
  console.log('=====================')

  const apiKey = process.env.AEROAPI_KEY
  if (!apiKey || apiKey === 'your-flightaware-aeroapi-key') {
    console.error('\nError: AEROAPI_KEY is not set. Add it to your .env file.')
    process.exit(1)
  }

  const targetIcao = process.argv[2]?.toUpperCase()
  const airlines = targetIcao
    ? airlinesConfig.airlines.filter((a) => a.icao === targetIcao)
    : airlinesConfig.airlines

  if (targetIcao && airlines.length === 0) {
    const valid = airlinesConfig.airlines.map((a) => a.icao).join(', ')
    console.error(`\nError: Unknown airline ICAO "${targetIcao}". Valid options: ${valid}`)
    process.exit(1)
  }

  console.log(`Aircraft families: ${familiesConfig.families.map((f) => f.name).join(', ')}`)
  console.log(`Airlines to seed: ${airlines.map((a) => `${a.name} (${a.icao})`).join(', ')}`)

  for (const airline of airlines) {
    await seedAirline(airline.icao, airline.name, airline.hubs)
    await sleep(DELAY_BETWEEN_AIRLINES_MS)
  }

  const total = await prisma.route.count()
  console.log(`\n✅ Seed complete. Total routes in database: ${total}`)
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
