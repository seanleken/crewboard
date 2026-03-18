'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, Save } from 'lucide-react'
import airlinesData from '@/config/airlines.json'
import familiesData from '@/config/aircraft-families.json'
import ScheduleTable, { type ScheduleData } from '@/components/ScheduleTable'
import type { GeneratedSchedule } from '@/lib/schedule-generator'

const LEG_OPTIONS = [2, 4, 6, 8]
const MAX_LEG_HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1)

const inputClass =
  'w-full bg-white border border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-gray-900 px-3 py-2.5 rounded-md text-base transition-colors duration-150 outline-none'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

export default function ScheduleGenerator() {
  const router = useRouter()
  const [airlineIcao, setAirlineIcao] = useState(airlinesData.airlines[0].icao)
  const [familyId, setFamilyId] = useState(familiesData.families[0].id)
  const [maxLegHours, setMaxLegHours] = useState(3)
  const [totalLegs, setTotalLegs] = useState(4)

  const [draft, setDraft] = useState<GeneratedSchedule | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setGenerating(true)
    setError(null)
    setDraft(null)
    setSavedId(null)

    try {
      const res = await fetch('/api/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlineIcao, familyId, maxLegHours, totalLegs }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      setDraft(data.result)
    } catch {
      setError('Failed to connect to the server')
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save schedule')
        return
      }
      setSavedId(data.schedule.id)
      router.refresh()
    } catch {
      setError('Failed to connect to the server')
    } finally {
      setSaving(false)
    }
  }

  const isLoading = generating || saving
  const isSaved = savedId !== null

  return (
    <div className="space-y-6">
      {/* Generator form */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-5">Generate Schedule</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className={labelClass}>Airline</label>
            <select
              value={airlineIcao}
              onChange={(e) => setAirlineIcao(e.target.value)}
              className={inputClass}
            >
              {airlinesData.airlines.map((a) => (
                <option key={a.icao} value={a.icao}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Aircraft Family</label>
            <select
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className={inputClass}
            >
              {familiesData.families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Max Leg Duration</label>
            <select
              value={maxLegHours}
              onChange={(e) => setMaxLegHours(Number(e.target.value))}
              className={inputClass}
            >
              {MAX_LEG_HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Number of Legs</label>
            <select
              value={totalLegs}
              onChange={(e) => setTotalLegs(Number(e.target.value))}
              className={inputClass}
            >
              {LEG_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} legs
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={generate}
            disabled={isLoading}
            className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-md transition-colors duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Schedule'
            )}
          </button>

          {draft && !generating && (
            <button
              onClick={generate}
              disabled={isLoading}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 px-4 py-2.5 rounded-md transition-colors duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw size={15} />
              Regenerate
            </button>
          )}

          {draft && !generating && !isSaved && (
            <button
              onClick={save}
              disabled={isLoading}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 px-4 py-2.5 rounded-md transition-colors duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Schedule
                </>
              )}
            </button>
          )}

          {isSaved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle size={15} />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      {/* Skeleton while generating */}
      {generating && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-3">
          <div className="h-5 bg-gray-100 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-1/4 animate-pulse" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: totalLegs }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Draft result */}
      {draft && !generating && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <ScheduleTable schedule={draft as ScheduleData} />
        </div>
      )}
    </div>
  )
}
