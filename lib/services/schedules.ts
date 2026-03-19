import { prisma } from '@/lib/prisma'
import type { GeneratedSchedule } from '@/lib/schedule-generator'

// --- Schedules ---

export function listSchedules(userId: string, limit?: number) {
  return prisma.schedule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    ...(limit && { take: limit }),
    select: {
      id: true,
      airline: true,
      family: true,
      baseIcao: true,
      mode: true,
      legs: true,
      completed: true,
      createdAt: true,
    },
  })
}

export function getSchedulesWithFlights(userId: string) {
  return prisma.schedule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { flights: { orderBy: { sequence: 'asc' } } },
  })
}

export function getSchedule(id: string) {
  return prisma.schedule.findUnique({
    where: { id },
    include: { flights: { orderBy: { sequence: 'asc' } } },
  })
}

const scheduleCreateData = (userId: string, draft: GeneratedSchedule) => ({
  userId,
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
})

export function createSchedule(userId: string, draft: GeneratedSchedule) {
  return prisma.schedule.create({
    data: scheduleCreateData(userId, draft),
    include: { flights: { orderBy: { sequence: 'asc' } } },
  })
}

export function replaceSchedule(userId: string, draft: GeneratedSchedule) {
  return prisma.$transaction(async (tx) => {
    await tx.schedule.deleteMany({ where: { userId } })
    return tx.schedule.create({
      data: scheduleCreateData(userId, draft),
      include: { flights: { orderBy: { sequence: 'asc' } } },
    })
  })
}

export function getActiveSchedule(userId: string) {
  return prisma.schedule.findFirst({
    where: { userId },
    include: { flights: { orderBy: { sequence: 'asc' } } },
  })
}

export function markScheduleComplete(id: string) {
  return prisma.schedule.update({
    where: { id },
    data: { completed: true },
  })
}

export function deleteSchedule(id: string) {
  return prisma.schedule.delete({ where: { id } })
}

// --- Flights ---

export function getFlight(flightId: string) {
  return prisma.scheduleFlight.findUnique({
    where: { id: flightId },
    include: { schedule: true },
  })
}

export function markFlightComplete(flightId: string) {
  return prisma.scheduleFlight.update({
    where: { id: flightId },
    data: { completed: true },
  })
}
