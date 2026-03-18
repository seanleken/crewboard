'use server'

import { signIn, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return 'Invalid email or password'
    }
    throw error
  }
}

export async function registerAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const name = (formData.get('name') as string).trim()

  if (!email || !password) return 'Email and password are required'
  if (password.length < 8) return 'Password must be at least 8 characters'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return 'An account with this email already exists'

  const hashedPassword = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { email, hashedPassword, name: name || null },
  })

  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' })
  } catch (error) {
    if (error instanceof AuthError) {
      return 'Account created — please log in.'
    }
    throw error
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' })
}
