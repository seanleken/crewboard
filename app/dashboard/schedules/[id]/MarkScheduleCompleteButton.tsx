'use client'

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function MarkScheduleCompleteButton({
  scheduleId,
  initialCompleted,
}: {
  scheduleId: string
  initialCompleted: boolean
}) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  if (completed) {
    return (
      <span className="flex items-center gap-2 text-green-400 font-medium text-sm">
        <CheckCircle size={16} />
        Schedule complete
      </span>
    )
  }

  async function handleMark() {
    setLoading(true)
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, { method: 'PATCH' })
      if (res.ok) setCompleted(true)
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Mark schedule complete?</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-gray-400 hover:text-[#F1F2F4] px-3 py-1.5 rounded hover:bg-dark-elevated transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleMark}
          disabled={loading}
          className="text-sm text-green-400 hover:text-green-300 font-medium px-3 py-1.5 rounded border border-green-400/20 hover:border-green-400/30 hover:bg-green-900/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Confirm
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="bg-dark-elevated hover:bg-dark-border text-gray-400 hover:text-[#F1F2F4] border border-dark-border px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2"
    >
      <CheckCircle size={15} />
      Mark schedule complete
    </button>
  )
}
