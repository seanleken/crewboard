import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#F1F2F4]">Settings</h1>

      {/* Account card */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-base font-semibold text-[#F1F2F4] mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</p>
            <p className="text-[#F1F2F4]">{session.user.email}</p>
          </div>
        </div>
      </div>

      {/* Password card */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F1F2F4] mb-1">Password</h2>
            <p className="text-sm text-gray-400">Change your account password</p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-dark-elevated border border-dark-border px-2.5 py-1 rounded">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  )
}
