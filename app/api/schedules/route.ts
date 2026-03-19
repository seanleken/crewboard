import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import type { GeneratedSchedule } from '@/lib/schedule-generator'
import { getSchedulesWithFlights, replaceSchedule } from '@/lib/services/schedules'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const schedules = await getSchedulesWithFlights(session.user.id)
    return NextResponse.json({ schedules })
  } catch {
    return NextResponse.json({ error: 'Failed to load schedules' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const draft = body as GeneratedSchedule

  if (!draft?.airline || !draft?.flights?.length) {
    return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 })
  }

  try {
    const schedule = await replaceSchedule(session.user.id, draft)
    return NextResponse.json({ schedule }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 })
  }
}
