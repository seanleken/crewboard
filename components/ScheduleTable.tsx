'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

export interface ScheduleFlight {
  id?: string
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

export interface ScheduleData {
  id?: string
  airline: string
  family: string
  baseIcao: string
  mode: string
  maxLegH: number
  legs: number
  createdAt?: string
  flights: ScheduleFlight[]
}

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

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

function AirportCode({ icao, isHub }: { icao: string; isHub: boolean }) {
  if (isHub) {
    return (
      <span className="font-mono text-sm text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
        {icao}
      </span>
    )
  }
  return <span className="font-mono text-sm text-[#F1F2F4]">{icao}</span>
}

export default function ScheduleTable({ schedule }: { schedule: ScheduleData }) {
  const router = useRouter()
  const airlineName = getAirlineName(schedule.airline)
  const familyName = getFamilyName(schedule.family)
  const isOutAndBack = schedule.mode === 'out-and-back'
  const hubs = new Set(getHubs(schedule.airline))

  return (
    <div>
      {/* Schedule header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-[#F1F2F4]">
            <span className="font-mono text-accent-400 mr-2">{schedule.airline}</span>
            {airlineName} — Schedule from{' '}
            <span className="font-mono">{schedule.baseIcao}</span>
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {familyName} · {schedule.legs} legs · max {schedule.maxLegH}h ·{' '}
            <span className="capitalize">{schedule.mode}</span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-dark-border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-dark-sidebar border-b border-dark-border">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              {isOutAndBack && (
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dir
                </th>
              )}
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flight
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                From
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                To
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Block Time
              </th>
              {/* Chevron column — only rendered for saved schedules */}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {schedule.flights.map((flight) => {
              const isEvenPair = flight.pairIndex % 2 === 0
              const isClickable = !!flight.id

              return (
                <tr
                  key={flight.id ?? flight.sequence}
                  onClick={isClickable ? () => router.push(`/dashboard/flights/${flight.id}`) : undefined}
                  className={clsx(
                    'border-b border-dark-border last:border-0 transition-colors',
                    isEvenPair ? 'bg-dark-card' : 'bg-dark-elevated/50',
                    isClickable && 'cursor-pointer hover:bg-dark-elevated'
                  )}
                >
                  <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                    {flight.sequence}
                  </td>

                  {isOutAndBack && (
                    <td className="px-4 py-3">
                      {flight.direction === 'outbound' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-accent-400/10 text-accent-400">
                          → OUT
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-dark-elevated text-gray-400">
                          ← RTN
                        </span>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx('font-mono text-sm', flight.isGenerated ? 'text-gray-400' : 'text-[#F1F2F4]')}>
                        {flight.flightNumber}
                      </span>
                      {flight.isGenerated && (
                        <span
                          title="Estimated — no real route data for this leg"
                          className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-amber-900/20 text-amber-300"
                        >
                          est.
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <AirportCode icao={flight.originIcao} isHub={hubs.has(flight.originIcao)} />
                  </td>
                  <td className="px-4 py-3">
                    <AirportCode icao={flight.destinationIcao} isHub={hubs.has(flight.destinationIcao)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[#F1F2F4]">
                    {flight.aircraftIcao}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">
                    {formatDuration(flight.durationMinutes)}
                  </td>
                  <td className="pr-3 text-gray-600">
                    {isClickable && <ChevronRight size={14} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
