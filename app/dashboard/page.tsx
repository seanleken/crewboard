import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plane, ExternalLink, ArrowRight } from 'lucide-react'
import { getActiveSchedule } from '@/lib/services/schedules'
import { buildSimBriefUrl } from '@/lib/simbrief'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

function getAirlineName(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)?.name ?? icao
}

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeSchedule = await getActiveSchedule(session.user.id)
  const nextFlight = activeSchedule?.flights.find((f) => !f.completed) ?? null
  const allComplete = activeSchedule !== null && nextFlight === null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#F1F2F4]">Dashboard</h1>

      {/* No active schedule */}
      {!activeSchedule && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 flex flex-col items-center text-center">
          <Plane size={40} className="text-accent-400 mb-3" strokeWidth={1.5} />
          <p className="text-[#F1F2F4] font-medium">No active schedule</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Generate a schedule to get your next flight
          </p>
          <Link
            href="/dashboard/generate"
            className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
          >
            Generate schedule →
          </Link>
        </div>
      )}

      {/* All flights completed */}
      {allComplete && activeSchedule && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule Complete</span>
          </div>
          <p className="text-xl font-semibold text-[#F1F2F4] mb-1">
            You&apos;ve completed all {activeSchedule.legs} legs!
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {getAirlineName(activeSchedule.airline)} · {getFamilyName(activeSchedule.family)}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/dashboard/schedule"
              className="bg-dark-elevated hover:bg-dark-border text-gray-400 hover:text-[#F1F2F4] border border-dark-border px-4 py-2.5 rounded-md transition-colors text-sm font-medium"
            >
              View completed schedule
            </Link>
            <Link
              href="/dashboard/generate"
              className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors text-sm flex items-center gap-2"
            >
              Generate new <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* Next flight card */}
      {nextFlight && activeSchedule && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Next Flight</p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold font-mono text-[#F1F2F4]">
                  {nextFlight.flightNumber}
                </h2>
                {nextFlight.isGenerated && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-900/20 text-amber-300">
                    est.
                  </span>
                )}
              </div>
              <p className="text-lg font-mono text-gray-400">
                {nextFlight.originIcao} → {nextFlight.destinationIcao}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                <span className="font-mono text-accent-400 mr-2">{nextFlight.aircraftIcao}</span>
                {formatDuration(nextFlight.durationMinutes)}
                <span className="mx-2 text-gray-600">·</span>
                Leg {nextFlight.sequence} of {activeSchedule.legs}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                href={`/dashboard/flights/${nextFlight.id}`}
                className="text-sm text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
              >
                View flight <ArrowRight size={14} />
              </Link>
              <a
                href={buildSimBriefUrl(nextFlight, activeSchedule.airline)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors flex items-center gap-2 text-sm"
              >
                <ExternalLink size={15} />
                Dispatch in SimBrief
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Schedule progress card */}
      {activeSchedule && !allComplete && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Schedule Progress</p>
          <p className="text-sm text-gray-400 mb-1">
            {getAirlineName(activeSchedule.airline)} · {getFamilyName(activeSchedule.family)}
            <span className="mx-2 text-gray-600">·</span>
            {activeSchedule.mode === 'out-and-back' ? 'Out & back' : 'Chain'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Base: <span className="font-mono text-[#F1F2F4]">{activeSchedule.baseIcao}</span>
          </p>

          {(() => {
            const completed = activeSchedule.flights.filter((f) => f.completed).length
            const total = activeSchedule.legs
            const pct = Math.round((completed / total) * 100)
            return (
              <>
                <div className="w-full bg-dark-elevated rounded-full h-2 mb-2">
                  <div
                    className="bg-accent-400 rounded-full h-2 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{completed} of {total} completed</p>
                  <Link
                    href="/dashboard/schedule"
                    className="text-sm text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
                  >
                    View full schedule <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
