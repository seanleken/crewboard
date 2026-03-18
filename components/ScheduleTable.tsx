import clsx from 'clsx'
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

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

export default function ScheduleTable({ schedule }: { schedule: ScheduleData }) {
  const airlineName = getAirlineName(schedule.airline)
  const familyName = getFamilyName(schedule.family)
  const isOutAndBack = schedule.mode === 'out-and-back'

  return (
    <div>
      {/* Schedule header */}
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {airlineName} — Schedule from{' '}
            <span className="font-mono">{schedule.baseIcao}</span>
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {familyName} · {schedule.legs} legs · max {schedule.maxLegH}h ·{' '}
            <span className="capitalize">{schedule.mode}</span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
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
            </tr>
          </thead>
          <tbody>
            {schedule.flights.map((flight) => {
              const isEvenPair = flight.pairIndex % 2 === 0
              return (
                <tr
                  key={flight.id ?? flight.sequence}
                  className={clsx(
                    'border-b border-gray-100 last:border-0',
                    isEvenPair ? 'bg-white' : 'bg-gray-50/50'
                  )}
                >
                  <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                    {flight.sequence}
                  </td>

                  {isOutAndBack && (
                    <td className="px-4 py-3">
                      {flight.direction === 'outbound' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-600">
                          → OUT
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          ← RTN
                        </span>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm text-gray-900">
                        {flight.flightNumber}
                      </span>
                      {flight.isGenerated && (
                        <span
                          title="Estimated — no real route data for this leg"
                          className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200"
                        >
                          est.
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-sm text-gray-900">
                    {flight.originIcao}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">
                    {flight.destinationIcao}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">
                    {flight.aircraftIcao}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 tabular-nums">
                    {formatDuration(flight.durationMinutes)}
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
