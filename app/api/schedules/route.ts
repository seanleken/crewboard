import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import type { GeneratedSchedule } from '@/lib/schedule-generator'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const schedules = await prisma.schedule.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { flights: { orderBy: { sequence: 'asc' } } },
    })
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
    const schedule = await prisma.schedule.create({
      data: {
        userId: session.user.id,
        airline: draft.airline,
        family: draft.family,
        baseIcao: draft.baseIcao,
        mode: draft.mode,
        maxLegH: draft.maxLegH,
        legs: draft.legs,
        flights: {
          create: draft.flights.map((f) => ({
            sequence: f.sequence,
            pairIndex: f.pairIndex,
            direction: f.direction,
            flightNumber: f.flightNumber,
            originIcao: f.originIcao,
            destinationIcao: f.destinationIcao,
            aircraftIcao: f.aircraftIcao,
            durationMinutes: f.durationMinutes,
            isGenerated: f.isGenerated,
          })),
        },
      },
      include: { flights: { orderBy: { sequence: 'asc' } } },
    })
    return NextResponse.json({ schedule }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 })
  }
}
