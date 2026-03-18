import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ScheduleGenerator from './ScheduleGenerator'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-[#F1F2F4]">Dashboard</h1>
      <ScheduleGenerator />
    </div>
  )
}
