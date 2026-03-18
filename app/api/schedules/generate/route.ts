import { auth } from '@/auth'
import { generateSchedule, ScheduleGeneratorError } from '@/lib/schedule-generator'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { airlineIcao, familyId, maxLegHours, totalLegs } = body as Record<string, unknown>

  if (
    typeof airlineIcao !== 'string' ||
    typeof familyId !== 'string' ||
    typeof maxLegHours !== 'number' ||
    typeof totalLegs !== 'number'
  ) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  try {
    const result = await generateSchedule({ airlineIcao, familyId, maxLegHours, totalLegs })
    return NextResponse.json({ result })
  } catch (err) {
    if (err instanceof ScheduleGeneratorError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    console.error('Schedule generation failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
