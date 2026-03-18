interface FlightForDispatch {
  flightNumber: string
  aircraftIcao: string
  originIcao: string
  destinationIcao: string
  durationMinutes: number
}

export function buildSimBriefUrl(flight: FlightForDispatch, airlineIcao: string): string {
  const fltnum = flight.flightNumber.replace(/^[A-Z]+/, '')

  const params = new URLSearchParams({
    airline: airlineIcao,
    fltnum,
    type: flight.aircraftIcao,
    orig: flight.originIcao,
    dest: flight.destinationIcao,
  })

  return `https://dispatch.simbrief.com/options/custom?${params.toString()}`
}
