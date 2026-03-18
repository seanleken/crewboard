import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import { getSchedule } from '@/lib/services/schedules'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import ScheduleTable from '@/components/ScheduleTable'
import DeleteButton from './DeleteButton'
import MarkScheduleCompleteButton from './MarkScheduleCompleteButton'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

function getAirlineName(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)?.name ?? icao
}

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) notFound()

  const { id } = await params

  const schedule = await getSchedule(id)

  if (!schedule || schedule.userId !== session.user.id) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/dashboard/schedules"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#F1F2F4] transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          Back to schedules
        </Link>
        <div className="flex items-center gap-3">
          <MarkScheduleCompleteButton scheduleId={schedule.id} initialCompleted={schedule.completed} />
          <DeleteButton scheduleId={schedule.id} />
        </div>
      </div>

      {/* Metadata card */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-accent-400">{schedule.airline}</span>
          <h1 className="text-2xl font-semibold text-[#F1F2F4]">
            {getAirlineName(schedule.airline)}
          </h1>
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
          <span>
            {schedule.flights.filter((f) => f.completed).length}/{schedule.legs} flown
          </span>
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
          }}
        />
      </div>
    </div>
  )
}
