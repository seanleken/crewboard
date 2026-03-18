'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Plane, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import airlinesConfig from '@/config/airlines.json'
import familiesConfig from '@/config/aircraft-families.json'

interface Schedule {
  id: string
  airline: string
  family: string
  baseIcao: string
  mode: string
  legs: number
  createdAt: string
}

function getAirlineName(icao: string) {
  return airlinesConfig.airlines.find((a) => a.icao === icao)?.name ?? icao
}

function getFamilyName(id: string) {
  return familiesConfig.families.find((f) => f.id === id)?.name ?? id
}

export default function PastSchedulesList({ schedules }: { schedules: Schedule[] }) {
  const router = useRouter()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      setConfirmingId(null)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (schedules.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Past Schedules</h2>
        <div className="flex flex-col items-center py-10 text-center">
          <Plane size={40} className="text-gray-300 mb-3" strokeWidth={1.5} />
          <p className="text-gray-700 font-medium">No schedules yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Generate your first schedule using the form above
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Past Schedules</h2>
      </div>
      <ul>
        {schedules.map((schedule) => {
          const isConfirming = confirmingId === schedule.id
          const isDeleting = deletingId === schedule.id

          return (
            <li
              key={schedule.id}
              className="flex items-center justify-between px-6 py-3 border-b border-gray-100 last:border-0"
            >
              <Link
                href={`/dashboard/schedules/${schedule.id}`}
                className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-75 transition-opacity"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getAirlineName(schedule.airline)}{' '}
                    <span className="font-mono text-gray-500">· {schedule.baseIcao}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {getFamilyName(schedule.family)} · {schedule.legs} legs ·{' '}
                    {formatDistanceToNow(new Date(schedule.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2 ml-4 shrink-0">
                {isConfirming ? (
                  <>
                    <span className="text-sm text-gray-600">Delete this schedule?</span>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      disabled={isDeleting}
                      className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isDeleting ? <Loader2 size={13} className="animate-spin" /> : null}
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmingId(schedule.id)}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                    title="Delete schedule"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
