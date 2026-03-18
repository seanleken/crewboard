import { prisma } from '@/lib/prisma'

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export function createUser(data: { email: string; hashedPassword: string; name: string | null }) {
  return prisma.user.create({ data })
}
