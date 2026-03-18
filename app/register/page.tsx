'use client'

import { useActionState } from 'react'
import { registerAction } from '@/app/actions/auth'
import Link from 'next/link'
import { Plane, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [error, formAction, isPending] = useActionState(registerAction, undefined)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Plane size={32} className="text-brand-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-800">
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <form action={formAction} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Name{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                className="w-full bg-white border border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-md text-base transition-colors duration-150 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-md text-base transition-colors duration-150 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full bg-white border border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-md text-base transition-colors duration-150 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-md transition-colors duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
