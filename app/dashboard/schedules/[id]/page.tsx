import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Plane, LogOut } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { signOutAction } from '@/app/actions/auth'
import ScheduleTable from '@/components/ScheduleTable'
import DeleteButton from './DeleteButton'
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

  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: { flights: { orderBy: { sequence: 'asc' } } },
  })

  if (!schedule || schedule.userId !== session.user.id) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Plane size={18} className="text-brand-500" strokeWidth={1.5} />
          <span className="text-gray-900 font-bold text-xl">CrewBoard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user.email}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="hover:bg-gray-100 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors duration-100"
            >
              <LogOut size={16} strokeWidth={1.5} />
              Log out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={15} strokeWidth={1.5} />
            Back to dashboard
          </Link>
          <DeleteButton scheduleId={schedule.id} />
        </div>

        {/* Metadata card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {getAirlineName(schedule.airline)}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>
              Base: <span className="font-mono text-gray-700">{schedule.baseIcao}</span>
            </span>
            <span>{getFamilyName(schedule.family)}</span>
            <span>{schedule.legs} legs</span>
            <span>Max {schedule.maxLegH}h</span>
            <span className="capitalize">{schedule.mode}</span>
            <span>{formatDistanceToNow(schedule.createdAt, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Schedule table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <ScheduleTable
            schedule={{
              ...schedule,
              createdAt: schedule.createdAt.toISOString(),
            }}
          />
        </div>
      </main>
    </div>
  )
}
