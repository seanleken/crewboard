import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-dark-primary flex">
      <Sidebar email={session.user.email ?? ''} />
      {/* Offset for fixed sidebar on desktop, top bar on mobile */}
      <div className="flex-1 md:ml-[220px] pt-14 md:pt-0">
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
