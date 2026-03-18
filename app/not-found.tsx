import { Plane } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-primary flex flex-col items-center justify-center px-4 text-center">
      <Plane size={36} className="text-accent-400 mb-4" strokeWidth={1.5} />
      <h1 className="text-2xl font-semibold text-[#F1F2F4] mb-2">Page not found</h1>
      <p className="text-gray-400 text-sm mb-6">
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors text-sm"
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
