import { prisma } from '@/lib/prisma'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenerateScheduleInput {
  airlineIcao: string
  familyId: string
  maxLegHours: number
  totalLegs: number
  excludeAirports?: string[]
}

export interface GeneratedFlight {
  sequence: number
  pairIndex: number
  direction: string
  flightNumber: string
  originIcao: string
  destinationIcao: string
  aircraftIcao: string
  durationMinutes: number
  isGenerated: boolean
}

export interface GeneratedSchedule {
  airline: string
  family: string
  baseIcao: string
  mode: 'out-and-back' | 'chain'
  maxLegH: number
  legs: number
  flights: GeneratedFlight[]
}

export class ScheduleGeneratorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScheduleGeneratorError'
  }
}

// ─── Config helpers ───────────────────────────────────────────────────────────

function getAirlineConfig(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)
}

function getFamilyConfig(id: string) {
  return familiesConfig.families.find((f) => f.id === id)
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateReturnFlightNumber(flightNumber: string): string {
  const prefix = flightNumber.match(/^[A-Z]+/)?.[0] ?? ''
  const numberStr = flightNumber.match(/\d+/)?.[0] ?? '0'
  return prefix + String(parseInt(numberStr, 10) + 1)
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function queryRoutes(params: {
  airlineIcao: string
  originIcao?: string
  destinationIcao?: string
  aircraftIn?: string[]
  maxDuration?: number
  excludeDestinations?: string[]
}) {
  const destFilter: Record<string, unknown> = {}
  if (params.destinationIcao) destFilter.equals = params.destinationIcao
  if (params.excludeDestinations?.length) destFilter.notIn = params.excludeDestinations

  return prisma.route.findMany({
    where: {
      airlineIcao: params.airlineIcao,
      ...(params.originIcao && { originIcao: params.originIcao }),
      ...(Object.keys(destFilter).length > 0 && { destinationIcao: destFilter }),
      ...(params.aircraftIn && { aircraftIcao: { in: params.aircraftIn } }),
      ...(params.maxDuration && { durationMinutes: { lte: params.maxDuration } }),
    },
  })
}

async function estimateDuration(originIcao: string, destinationIcao: string): Promise<number> {
  const existing = await prisma.route.findFirst({ where: { originIcao, destinationIcao } })
  if (existing) return existing.durationMinutes

  const reverse = await prisma.route.findFirst({
    where: { originIcao: destinationIcao, destinationIcao: originIcao },
  })
  if (reverse) return reverse.durationMinutes

  return 120
}

// ─── Mode A: Out-and-back ────────────────────────────────────────────────────

async function generateOutAndBack(
  airlineIcao: string,
  familyCodes: string[],
  maxDurationMinutes: number,
  baseIcao: string,
  totalLegs: number,
  excludeAirports: string[]
): Promise<GeneratedFlight[]> {
  const numberOfPairs = totalLegs / 2

  const outboundCandidates = await queryRoutes({
    airlineIcao,
    originIcao: baseIcao,
    aircraftIn: familyCodes,
    maxDuration: maxDurationMinutes,
    excludeDestinations: excludeAirports,
  })

  if (outboundCandidates.length === 0) {
    throw new ScheduleGeneratorError(
      'Not enough matching routes for these filters. Try a different airline, aircraft family, or increase the maximum leg duration.'
    )
  }

  const flights: GeneratedFlight[] = []
  let sequence = 1
  const usedDestinations = new Set<string>()

  for (let i = 0; i < numberOfPairs; i++) {
    // Prefer unused destinations, fall back to full pool
    const unusedCandidates = outboundCandidates.filter(
      (r) => !usedDestinations.has(r.destinationIcao)
    )
    const pool = unusedCandidates.length > 0 ? unusedCandidates : outboundCandidates
    const outbound = randomChoice(pool)
    usedDestinations.add(outbound.destinationIcao)

    flights.push({
      sequence: sequence++,
      pairIndex: i,
      direction: 'outbound',
      flightNumber: outbound.flightNumber,
      originIcao: baseIcao,
      destinationIcao: outbound.destinationIcao,
      aircraftIcao: outbound.aircraftIcao,
      durationMinutes: outbound.durationMinutes,
      isGenerated: false,
    })

    // Find a real return route within the family
    const returnCandidates = await queryRoutes({
      airlineIcao,
      originIcao: outbound.destinationIcao,
      destinationIcao: baseIcao,
      aircraftIn: familyCodes,
      excludeDestinations: excludeAirports,
    })

    if (returnCandidates.length > 0) {
      const ret = randomChoice(returnCandidates)
      flights.push({
        sequence: sequence++,
        pairIndex: i,
        direction: 'return',
        flightNumber: ret.flightNumber,
        originIcao: outbound.destinationIcao,
        destinationIcao: baseIcao,
        aircraftIcao: outbound.aircraftIcao, // enforce aircraft consistency within pair
        durationMinutes: ret.durationMinutes,
        isGenerated: false,
      })
    } else {
      // No real return — generate fictional leg
      flights.push({
        sequence: sequence++,
        pairIndex: i,
        direction: 'return',
        flightNumber: generateReturnFlightNumber(outbound.flightNumber),
        originIcao: outbound.destinationIcao,
        destinationIcao: baseIcao,
        aircraftIcao: outbound.aircraftIcao,
        durationMinutes: outbound.durationMinutes,
        isGenerated: true,
      })
    }
  }

  return flights
}

// ─── Mode B: Chain ────────────────────────────────────────────────────────────

async function generateChain(
  airlineIcao: string,
  familyCodes: string[],
  maxDurationMinutes: number,
  baseIcao: string,
  hubSet: Set<string>,
  totalLegs: number,
  excludeAirports: string[]
): Promise<GeneratedFlight[]> {
  const flights: GeneratedFlight[] = []
  let currentAirport = baseIcao
  const eligibleHubs = Array.from(hubSet).filter((h) => !excludeAirports.includes(h))

  for (let leg = 1; leg <= totalLegs; leg++) {
    const candidates = await queryRoutes({
      airlineIcao,
      originIcao: currentAirport,
      aircraftIn: familyCodes,
      maxDuration: maxDurationMinutes,
      excludeDestinations: excludeAirports,
    })

    if (candidates.length > 0) {
      const selected = randomChoice(candidates)
      flights.push({
        sequence: leg,
        pairIndex: leg - 1,
        direction: 'outbound',
        flightNumber: selected.flightNumber,
        originIcao: currentAirport,
        destinationIcao: selected.destinationIcao,
        aircraftIcao: selected.aircraftIcao,
        durationMinutes: selected.durationMinutes,
        isGenerated: false,
      })
      currentAirport = selected.destinationIcao
    } else {
      // Stuck at an outstation — generate fictional leg back into the network
      const targetHub = randomChoice(eligibleHubs)
      const flightNumber =
        flights.length > 0
          ? generateReturnFlightNumber(flights[flights.length - 1].flightNumber)
          : airlineIcao + String(randomInt(1000, 9999))
      const duration = await estimateDuration(currentAirport, targetHub)

      flights.push({
        sequence: leg,
        pairIndex: leg - 1,
        direction: 'outbound',
        flightNumber,
        originIcao: currentAirport,
        destinationIcao: targetHub,
        aircraftIcao: randomChoice(familyCodes),
        durationMinutes: duration,
        isGenerated: true,
      })
      currentAirport = targetHub
    }
  }

  return flights
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GeneratedSchedule> {
  const airlineConfig = getAirlineConfig(input.airlineIcao)
  if (!airlineConfig) throw new ScheduleGeneratorError('Unknown airline code')

  const familyConfig = getFamilyConfig(input.familyId)
  if (!familyConfig) throw new ScheduleGeneratorError('Unknown aircraft family')

  if (!Number.isInteger(input.maxLegHours) || input.maxLegHours < 1 || input.maxLegHours > 18) {
    throw new ScheduleGeneratorError('Max leg duration must be between 1 and 18 hours')
  }

  if (!Number.isInteger(input.totalLegs) || input.totalLegs < 1 || input.totalLegs > 8) {
    throw new ScheduleGeneratorError('Number of legs must be between 1 and 8')
  }

  const hubSet = new Set(airlineConfig.hubs)
  const isSingleHub = hubSet.size === 1
  const excludeAirports = input.excludeAirports ?? []

  if (isSingleHub && input.totalLegs % 2 !== 0) {
    throw new ScheduleGeneratorError('Single-hub airlines require an even number of legs')
  }

  const routeCount = await prisma.route.count({ where: { airlineIcao: input.airlineIcao } })
  if (routeCount === 0) {
    throw new ScheduleGeneratorError(
      'No route data available for this airline. Please run the seed script.'
    )
  }

  const familyCodes = familyConfig.icao_codes
  const maxDurationMinutes = input.maxLegHours * 60
  const mode: 'out-and-back' | 'chain' = isSingleHub ? 'out-and-back' : 'chain'

  // For chain mode, pick a starting hub that isn't excluded
  const eligibleHubs = airlineConfig.hubs.filter((h) => !excludeAirports.includes(h))
  if (!isSingleHub && eligibleHubs.length === 0) {
    throw new ScheduleGeneratorError(
      'Not enough matching routes for these filters. Try a different airline, aircraft family, or increase the maximum leg duration.'
    )
  }
  const baseIcao = isSingleHub ? airlineConfig.hubs[0] : randomChoice(eligibleHubs)

  const flights =
    mode === 'out-and-back'
      ? await generateOutAndBack(
          input.airlineIcao,
          familyCodes,
          maxDurationMinutes,
          baseIcao,
          input.totalLegs,
          excludeAirports
        )
      : await generateChain(
          input.airlineIcao,
          familyCodes,
          maxDurationMinutes,
          baseIcao,
          hubSet,
          input.totalLegs,
          excludeAirports
        )

  return {
    airline: input.airlineIcao,
    family: input.familyId,
    baseIcao,
    mode,
    maxLegH: input.maxLegHours,
    legs: input.totalLegs,
    flights,
  }
}
