import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDistanceToNow } from 'date-fns'
import { Plane } from 'lucide-react'
import Link from 'next/link'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

function getAirlineName(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)?.name ?? icao
}

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

export default async function SchedulesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const schedules = await prisma.schedule.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      airline: true,
      family: true,
      baseIcao: true,
      mode: true,
      legs: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#F1F2F4]">Schedules</h1>

      {schedules.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 flex flex-col items-center text-center">
          <Plane size={40} className="text-accent-400 mb-3" strokeWidth={1.5} />
          <p className="text-[#F1F2F4] font-medium">No saved schedules yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Head to the dashboard to generate your first schedule
          </p>
          <Link
            href="/dashboard"
            className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
          >
            Go to Dashboard →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {schedules.map((schedule) => (
            <li key={schedule.id}>
              <Link
                href={`/dashboard/schedules/${schedule.id}`}
                className="flex items-center justify-between bg-dark-card border border-dark-border rounded-lg px-5 py-4 hover:bg-dark-elevated transition-colors cursor-pointer"
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
                <div className="ml-4 shrink-0">
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
      )}
    </div>
  )
}
