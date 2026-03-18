import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getFlight, markFlightComplete } from '@/lib/services/schedules'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ flightId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { flightId } = await params

  try {
    const flight = await getFlight(flightId)

    if (!flight || flight.schedule.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await markFlightComplete(flightId)
    return NextResponse.json({ flight: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update flight' }, { status: 500 })
  }
}
