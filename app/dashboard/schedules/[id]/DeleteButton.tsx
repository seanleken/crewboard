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
      router.push('/dashboard')
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Delete this schedule?</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded hover:bg-red-50 border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
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
      className="bg-white hover:bg-red-50 text-red-600 font-medium border border-red-200 hover:border-red-300 px-4 py-2.5 rounded-md transition-colors flex items-center gap-2"
    >
      <Trash2 size={15} strokeWidth={1.5} />
      Delete
    </button>
  )
}
