import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Plane } from 'lucide-react'
import { getActiveSchedule } from '@/lib/services/schedules'
import ScheduleTable, { type ScheduleData } from '@/components/ScheduleTable'
import MarkScheduleCompleteButton from './MarkScheduleCompleteButton'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

function getAirlineName(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)?.name ?? icao
}

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

export default async function ActiveSchedulePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const schedule = await getActiveSchedule(session.user.id)

  if (!schedule) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-[#F1F2F4]">Active Schedule</h1>
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 flex flex-col items-center text-center">
          <Plane size={40} className="text-accent-400 mb-3" strokeWidth={1.5} />
          <p className="text-[#F1F2F4] font-medium">No active schedule</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Generate a schedule to get started
          </p>
          <Link
            href="/dashboard/generate"
            className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
          >
            Generate schedule →
          </Link>
        </div>
      </div>
    )
  }

  const completedLegs = schedule.flights.filter((f) => f.completed).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-[#F1F2F4]">Active Schedule</h1>
        <MarkScheduleCompleteButton scheduleId={schedule.id} initialCompleted={schedule.completed} />
      </div>

      {/* Metadata card */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-accent-400">{schedule.airline}</span>
          <h2 className="text-xl font-semibold text-[#F1F2F4]">
            {getAirlineName(schedule.airline)}
          </h2>
          {schedule.completed && (
            <span className="text-xs font-medium px-2 py-0.5 rounded border bg-green-900/20 text-green-400 border-green-400/20">
              Completed
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-2">
          <span>
            Base: <span className="font-mono text-[#F1F2F4]">{schedule.baseIcao}</span>
          </span>
          <span>{getFamilyName(schedule.family)}</span>
          <span>{completedLegs}/{schedule.legs} flown</span>
          <span>Max {schedule.maxLegH}h</span>
          <span>
            {schedule.mode === 'out-and-back' ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-dark-elevated text-blue-400 border-blue-400/20">
                Out &amp; back
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-dark-elevated text-accent-400 border-accent-400/20">
                Chain
              </span>
            )}
          </span>
          <span>{formatDistanceToNow(schedule.createdAt, { addSuffix: true })}</span>
        </div>
      </div>

      {/* Schedule table */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <ScheduleTable
          schedule={{
            ...schedule,
            createdAt: schedule.createdAt.toISOString(),
          } as ScheduleData}
        />
      </div>
    </div>
  )
}
