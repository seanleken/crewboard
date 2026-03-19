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
  'w-full bg-dark-elevated border border-dark-border focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 text-[#F1F2F4] px-3 py-2.5 rounded-md text-base transition-colors outline-none'
const labelClass = 'block text-sm font-medium text-gray-400 mb-1.5'

interface ActiveScheduleInfo {
  airline: string
  completedLegs: number
  totalLegs: number
}

export default function ScheduleGenerator({ activeInfo }: { activeInfo?: ActiveScheduleInfo | null }) {
  const router = useRouter()
  const [airlineIcao, setAirlineIcao] = useState(airlinesData.airlines[0].icao)
  const [familyId, setFamilyId] = useState(familiesData.families[0].id)
  const [maxLegHours, setMaxLegHours] = useState(3)
  const [totalLegs, setTotalLegs] = useState(4)
  const [excludeInput, setExcludeInput] = useState('')

  const [draft, setDraft] = useState<GeneratedSchedule | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingReplace, setConfirmingReplace] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const airlineName = airlinesData.airlines.find((a) => a.icao === activeInfo?.airline)?.name ?? activeInfo?.airline

  async function generate() {
    setGenerating(true)
    setError(null)
    setDraft(null)
    setSavedId(null)

    const excludeAirports = excludeInput
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z]{4}$/.test(s))

    try {
      const res = await fetch('/api/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlineIcao, familyId, maxLegHours, totalLegs, excludeAirports }),
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

    if (activeInfo && !confirmingReplace) {
      setConfirmingReplace(true)
      return
    }

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
        setConfirmingReplace(false)
        return
      }
      setSavedId(data.schedule.id)
      router.push('/dashboard')
    } catch {
      setError('Failed to connect to the server')
      setConfirmingReplace(false)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = generating || saving
  const isSaved = savedId !== null

  return (
    <div className="space-y-6">
      {/* Active schedule warning banner */}
      {activeInfo && activeInfo.completedLegs < activeInfo.totalLegs && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-amber-200">
            You have an active schedule ({airlineName} · {activeInfo.completedLegs} of {activeInfo.totalLegs} legs completed).
            Saving a new schedule will replace it and all progress will be lost.
          </p>
        </div>
      )}

      {/* Generator form */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-[#F1F2F4] mb-5">Generate Schedule</h2>

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

        <div className="mb-5">
          <label className={labelClass}>Exclude Airports</label>
          <input
            type="text"
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            placeholder="e.g. KORD, KJFK"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={generate}
            disabled={isLoading}
            className="bg-accent-400 hover:bg-accent-500 active:bg-accent-600 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              className="bg-dark-elevated hover:bg-dark-border text-gray-400 hover:text-[#F1F2F4] font-medium border border-dark-border px-4 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw size={15} />
              Regenerate
            </button>
          )}

          {draft && !generating && !isSaved && !confirmingReplace && (
            <button
              onClick={save}
              disabled={isLoading}
              className="bg-dark-elevated hover:bg-dark-border text-gray-400 hover:text-[#F1F2F4] font-medium border border-dark-border px-4 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

          {draft && !generating && !isSaved && confirmingReplace && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-400">This will delete your current schedule and all flight progress.</span>
              <button
                onClick={() => setConfirmingReplace(false)}
                className="text-sm text-gray-400 hover:text-[#F1F2F4] px-3 py-1.5 rounded hover:bg-dark-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="text-sm text-amber-300 hover:text-amber-200 font-medium px-3 py-1.5 rounded border border-amber-400/20 hover:border-amber-400/30 hover:bg-amber-900/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Replace schedule
              </button>
            </div>
          )}

          {isSaved && (
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle size={15} />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && !isLoading && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-amber-200">{error}</p>
        </div>
      )}

      {/* Skeleton while generating */}
      {generating && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-3">
          <div className="h-5 bg-dark-elevated rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-dark-elevated rounded w-1/4 animate-pulse" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: totalLegs }).map((_, i) => (
              <div key={i} className="h-10 bg-dark-elevated rounded animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Draft result */}
      {draft && !generating && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <ScheduleTable schedule={draft as ScheduleData} />
        </div>
      )}
    </div>
  )
}
