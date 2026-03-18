import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { signOutAction } from '@/app/actions/auth'
import { Plane, LogOut } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import ScheduleGenerator from './ScheduleGenerator'
import PastSchedulesList from './PastSchedulesList'

export default async function DashboardPage() {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <ScheduleGenerator />
        <PastSchedulesList
          schedules={schedules.map((s) => ({
            ...s,
            createdAt: s.createdAt.toISOString(),
          }))}
        />
      </main>
    </div>
  )
}
