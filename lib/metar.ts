export interface MetarResult {
  raw: string
  reportTime: string
}

export async function fetchMetar(icao: string): Promise<MetarResult | null> {
  try {
    const res = await fetch(
      `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`,
      { next: { revalidate: 1800 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const entry = data[0]
    if (!entry.rawOb) return null
    return {
      raw: entry.rawOb,
      reportTime: entry.reportTime ?? '',
    }
  } catch {
    return null
  }
}

export function formatObservationTime(reportTime: string): string {
  if (!reportTime) return ''
  try {
    const date = new Date(reportTime)
    const hh = date.getUTCHours().toString().padStart(2, '0')
    const mm = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hh}:${mm} UTC`
  } catch {
    return ''
  }
}
