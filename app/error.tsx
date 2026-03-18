'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
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
    <div className="min-h-screen bg-dark-primary flex flex-col items-center justify-center px-4 text-center">
      <AlertTriangle size={36} className="text-amber-400 mb-4" strokeWidth={1.5} />
      <h1 className="text-2xl font-semibold text-[#F1F2F4] mb-2">Something went wrong</h1>
      <p className="text-gray-400 text-sm mb-6 max-w-sm">
        An unexpected error occurred. Try again — if the problem persists, check your connection.
      </p>
      <button
        onClick={reset}
        className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
