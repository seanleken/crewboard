import { Plane } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
        <span className="text-gray-900 font-bold text-xl">CrewBoard</span>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 px-4 py-2 rounded-md text-sm transition-colors duration-150"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors duration-150 shadow-sm"
          >
            Register
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="flex justify-center mb-6">
          <Plane size={40} className="text-brand-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Realistic schedules for flight sim pilots
        </h1>
        <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
          Pick an airline, choose an aircraft family, and get an operationally
          consistent schedule built from real-world route data.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/register"
            className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-md transition-colors duration-150 shadow-sm"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 px-4 py-2.5 rounded-md transition-colors duration-150 shadow-sm"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  )
}
