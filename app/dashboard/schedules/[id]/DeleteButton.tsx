'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteButton({ scheduleId }: { scheduleId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' })
      router.push('/dashboard/schedules')
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Delete this schedule?</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-gray-400 hover:text-[#F1F2F4] px-3 py-1.5 rounded hover:bg-dark-elevated transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded border border-red-400/20 hover:border-red-400/30 hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {deleting && <Loader2 size={13} className="animate-spin" />}
          Delete
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="bg-transparent hover:bg-red-900/20 text-red-400 hover:text-red-300 font-medium border border-red-400/20 hover:border-red-400/30 px-4 py-2.5 rounded-md transition-colors flex items-center gap-2"
    >
      <Trash2 size={15} strokeWidth={1.5} />
      Delete
    </button>
  )
}
