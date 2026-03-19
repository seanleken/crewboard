import { Suspense } from 'react'
import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import { getFlight } from '@/lib/services/schedules'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { buildSimBriefUrl } from '@/lib/simbrief'
import { fetchMetar, formatObservationTime } from '@/lib/metar'
import { getAirport } from '@/lib/airports'
import RouteMap from '@/components/RouteMap'
import MarkFlownButton from './MarkFlownButton'
import airlinesConfig from '@/config/airlines.json'

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function getAirlineName(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)?.name ?? icao
}

function getHubs(airlineIcao: string): string[] {
  return airlinesConfig.airlines.find((a) => a.icao === airlineIcao)?.hubs ?? []
}

// --- METAR card (async server component, streamed via Suspense) ---

async function MetarCard({
  icao,
  label,
  isHub,
}: {
  icao: string
  label: 'Departure' | 'Arrival'
  isHub: boolean
}) {
  const metar = await fetchMetar(icao)

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center gap-2 mb-4">
        {isHub ? (
          <span className="text-lg font-mono font-semibold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
            {icao}
          </span>
        ) : (
          <span className="text-lg font-mono font-semibold text-[#F1F2F4]">{icao}</span>
        )}
      </div>

      {metar === null ? (
        <p className="text-sm text-gray-500">Weather data unavailable</p>
      ) : metar.raw ? (
        <div>
          <p className="font-mono text-sm text-gray-400 whitespace-pre-wrap break-words leading-relaxed">
            {metar.raw}
          </p>
          {metar.reportTime && (
            <p className="text-xs text-gray-500 mt-3">
              Observed: {formatObservationTime(metar.reportTime)}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No METAR available for this station</p>
      )}
    </div>
  )
}

function MetarSkeleton({ label }: { label: string }) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="h-6 w-16 bg-dark-elevated rounded mb-4 animate-pulse" />
      <div className="h-4 bg-dark-elevated rounded animate-pulse" />
    </div>
  )
}

// --- Page ---

export default async function FlightDetailPage({
  params,
}: {
  params: Promise<{ flightId: string }>
}) {
  const session = await auth()
  if (!session) notFound()

  const { flightId } = await params

  const flight = await getFlight(flightId)

  if (!flight || flight.schedule.userId !== session.user.id) notFound()

  const { schedule } = flight
  const airlineName = getAirlineName(schedule.airline)
  const simBriefUrl = buildSimBriefUrl(flight, schedule.airline)
  const hubs = new Set(getHubs(schedule.airline))
  const originAirport = getAirport(flight.originIcao)
  const destAirport = getAirport(flight.destinationIcao)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/schedule"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#F1F2F4] transition-colors"
      >
        <ArrowLeft size={15} strokeWidth={1.5} />
        Back to schedule
      </Link>

      {/* Flight info card */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold font-mono text-[#F1F2F4]">
                {flight.flightNumber}
              </h1>
              {flight.isGenerated && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-900/20 text-amber-300">
                  est.
                </span>
              )}
            </div>
            <p className="text-lg font-mono text-gray-400">
              {flight.originIcao} → {flight.destinationIcao}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <MarkFlownButton flightId={flight.id} initialCompleted={flight.completed} />
            <a
              href={simBriefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Dispatch in SimBrief
            </a>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-dark-border grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Aircraft</p>
            <p className="font-mono text-accent-400">{flight.aircraftIcao}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Block Time</p>
            <p className="text-[#F1F2F4]">{formatDuration(flight.durationMinutes)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Leg</p>
            <p className="text-[#F1F2F4]">{flight.sequence} of {schedule.legs}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Mode</p>
            {schedule.mode === 'out-and-back' ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-dark-elevated text-blue-400 border-blue-400/20">
                Out &amp; back
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-dark-elevated text-accent-400 border-accent-400/20">
                Chain
              </span>
            )}
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Airline</p>
            <p className="text-gray-400">
              <span className="font-mono text-accent-400 mr-2">{schedule.airline}</span>
              {airlineName}
            </p>
          </div>
        </div>
      </div>

      {/* Route map */}
      {originAirport && destAirport && (
        <RouteMap
          origin={{ icao: flight.originIcao, name: originAirport.name, lat: originAirport.lat, lon: originAirport.lon }}
          destination={{ icao: flight.destinationIcao, name: destAirport.name, lat: destAirport.lat, lon: destAirport.lon }}
        />
      )}

      {/* METAR cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Suspense fallback={<MetarSkeleton label="Departure" />}>
          <MetarCard
            icao={flight.originIcao}
            label="Departure"
            isHub={hubs.has(flight.originIcao)}
          />
        </Suspense>
        <Suspense fallback={<MetarSkeleton label="Arrival" />}>
          <MetarCard
            icao={flight.destinationIcao}
            label="Arrival"
            isHub={hubs.has(flight.destinationIcao)}
          />
        </Suspense>
      </div>
    </div>
  )
}
