interface FlightForDispatch {
  flightNumber: string
  aircraftIcao: string
  originIcao: string
  destinationIcao: string
  durationMinutes: number
}

export function buildSimBriefUrl(flight: FlightForDispatch, airlineIcao: string): string {
  const fltnum = flight.flightNumber.replace(/^[A-Z]+/, '')
  const steh = Math.floor(flight.durationMinutes / 60)
  const stem = flight.durationMinutes % 60

  const params = new URLSearchParams({
    airline: airlineIcao,
    fltnum,
    type: flight.aircraftIcao,
    orig: flight.originIcao,
    dest: flight.destinationIcao,
    steh: String(steh),
    stem: String(stem),
  })

  return `https://dispatch.simbrief.com/options/custom?${params.toString()}`
}
