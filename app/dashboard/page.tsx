import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import ScheduleGenerator from './ScheduleGenerator'
import { listSchedules } from '@/lib/services/schedules'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

function getAirlineName(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)?.name ?? icao
}

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const recentSchedules = await listSchedules(session.user.id, 3)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-[#F1F2F4]">Dashboard</h1>
      <ScheduleGenerator />

      {recentSchedules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#F1F2F4]">Recent Schedules</h2>
            <Link
              href="/dashboard/schedules"
              className="text-sm text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="space-y-2">
            {recentSchedules.map((schedule) => (
              <li key={schedule.id}>
                <Link
                  href={`/dashboard/schedules/${schedule.id}`}
                  className="flex items-center justify-between bg-dark-card border border-dark-border rounded-lg px-5 py-4 hover:bg-dark-elevated transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-accent-400">{schedule.airline}</span>
                      <span className="font-medium text-[#F1F2F4]">{getAirlineName(schedule.airline)}</span>
                      <span className="font-mono text-sm text-gray-400">{schedule.baseIcao}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {getFamilyName(schedule.family)} · {schedule.legs} legs ·{' '}
                      {formatDistanceToNow(new Date(schedule.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 flex items-center gap-2">
                    {schedule.completed && (
                      <span className="text-xs font-medium px-2 py-1 rounded border bg-green-900/20 text-green-400 border-green-400/20">
                        Completed
                      </span>
                    )}
                    {schedule.mode === 'out-and-back' ? (
                      <span className="text-xs font-medium px-2 py-1 rounded border bg-dark-elevated text-blue-400 border-blue-400/20">
                        Out &amp; back
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded border bg-dark-elevated text-accent-400 border-accent-400/20">
                        Chain
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
