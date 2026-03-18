'use client'

import { useActionState } from 'react'
import { loginAction } from '@/app/actions/auth'
import Link from 'next/link'
import { Plane, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(loginAction, undefined)

  return (
    <div className="min-h-screen bg-dark-primary flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Plane size={32} className="text-accent-400" strokeWidth={1.5} />
        </div>
        <h1 className="text-center text-2xl font-semibold text-[#F1F2F4]">
          Sign in to CrewBoard
        </h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          No account?{' '}
          <Link
            href="/register"
            className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
          >
            Register
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <form action={formAction} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-400/20 rounded-md p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-dark-elevated border border-dark-border focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 text-[#F1F2F4] placeholder:text-gray-500 px-3 py-2.5 rounded-md text-base transition-colors outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-dark-elevated border border-dark-border focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20 text-[#F1F2F4] placeholder:text-gray-500 px-3 py-2.5 rounded-md text-base transition-colors outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-accent-400 hover:bg-accent-500 active:bg-accent-600 text-dark-primary font-semibold px-4 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
