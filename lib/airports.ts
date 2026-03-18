export interface AirportInfo {
  icao: string
  lat: number
  lon: number
  name: string
  city: string
  country: string
  elevation: number
  tz: string
}

// Cast to avoid TypeScript inferring the full 9MB JSON structure
// eslint-disable-next-line @typescript-eslint/no-require-imports
const airportsData = require('@/config/airports.json') as Record<string, AirportInfo>

export function getAirport(icao: string): AirportInfo | null {
  return airportsData[icao] ?? null
}
