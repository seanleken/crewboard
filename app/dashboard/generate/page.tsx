import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getActiveSchedule } from '@/lib/services/schedules'
import ScheduleGenerator from '../ScheduleGenerator'

export default async function GeneratePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeSchedule = await getActiveSchedule(session.user.id)

  const activeInfo = activeSchedule
    ? {
        airline: activeSchedule.airline,
        completedLegs: activeSchedule.flights.filter((f) => f.completed).length,
        totalLegs: activeSchedule.legs,
      }
    : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#F1F2F4]">Generate Schedule</h1>
      <ScheduleGenerator activeInfo={activeInfo} />
    </div>
  )
}
