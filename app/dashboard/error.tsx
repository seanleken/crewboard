'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertTriangle size={32} className="text-amber-400 mb-4" strokeWidth={1.5} />
      <h2 className="text-xl font-semibold text-[#F1F2F4] mb-2">Something went wrong</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-sm">
        An unexpected error occurred loading this page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors text-sm"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="bg-dark-elevated hover:bg-dark-border text-gray-400 hover:text-[#F1F2F4] border border-dark-border px-4 py-2.5 rounded-md transition-colors text-sm"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
