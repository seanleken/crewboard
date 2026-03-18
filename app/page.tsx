import { Plane, SlidersHorizontal, Route } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/auth'

const airlines = [
  { icao: 'DLH', name: 'Lufthansa' },
  { icao: 'AFR', name: 'Air France' },
  { icao: 'BEL', name: 'Brussels Airlines' },
  { icao: 'BAW', name: 'British Airways' },
  { icao: 'AAL', name: 'American Airlines' },
  { icao: 'UAL', name: 'United Airlines' },
  { icao: 'DAL', name: 'Delta Air Lines' },
  { icao: 'FFT', name: 'Frontier Airlines' },
  { icao: 'EZY', name: 'easyJet' },
  { icao: 'RYR', name: 'Ryanair' },
]

export default async function Home() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-dark-primary">
      {/* Top nav */}
      <nav className="bg-dark-sidebar border-b border-dark-border h-14 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Plane size={16} className="text-accent-400" strokeWidth={1.5} />
          <span className="font-bold text-lg text-[#F1F2F4]">CrewBoard</span>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <Link
              href="/dashboard"
              className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2 rounded-md text-sm transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="border border-dark-border text-gray-400 hover:text-[#F1F2F4] hover:bg-dark-elevated font-medium px-4 py-2 rounded-md text-sm transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-accent-400 hover:bg-accent-500 text-dark-primary font-semibold px-4 py-2 rounded-md text-sm transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative flex flex-col items-center text-center px-4 pt-24 pb-20">
          {/* Subtle amber radial glow */}
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse at center, #FFC107 0%, transparent 70%)' }}
          />
          <Plane size={36} className="text-accent-400 mb-6 relative" strokeWidth={1.5} />
          <h1 className="text-4xl font-semibold text-[#F1F2F4] mb-4 max-w-2xl leading-tight relative">
            Realistic schedules for flight sim pilots
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-xl relative">
            Pick an airline, choose an aircraft family, and get an operationally consistent schedule built from real-world route data.
          </p>
          <div className="flex justify-center gap-3 relative">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-accent-400 hover:bg-accent-500 active:bg-accent-600 text-dark-primary font-semibold px-5 py-2.5 rounded-md transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="bg-accent-400 hover:bg-accent-500 active:bg-accent-600 text-dark-primary font-semibold px-5 py-2.5 rounded-md transition-colors"
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  className="border border-dark-border text-gray-400 hover:text-[#F1F2F4] hover:bg-dark-elevated font-medium px-5 py-2.5 rounded-md transition-colors"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-center text-xl font-semibold text-[#F1F2F4] mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '01', icon: Plane, title: 'Choose your airline', desc: 'Select from 10 real-world airlines with cached route data.' },
              { step: '02', icon: SlidersHorizontal, title: 'Set your preferences', desc: 'Pick your aircraft family, max leg duration, and number of legs.' },
              { step: '03', icon: Route, title: 'Fly your schedule', desc: 'Get a realistic, operationally consistent schedule ready to fly.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-dark-card border border-dark-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold font-mono text-accent-400 bg-accent-400/10 px-2 py-0.5 rounded">
                    {step}
                  </span>
                  <Icon size={17} className="text-accent-400" strokeWidth={1.5} />
                </div>
                <h3 className="font-medium text-[#F1F2F4] mb-1">{title}</h3>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Two modes */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-center text-xl font-semibold text-[#F1F2F4] mb-8">Two schedule modes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-dark-card border border-dark-border border-l-2 border-l-accent-400 rounded-lg p-6">
              <h3 className="font-semibold text-[#F1F2F4] mb-2">Out-and-back</h3>
              <p className="text-sm text-gray-400 mb-4">
                Single-hub airlines like British Airways. Paired flights with consistent aircraft — fly out, fly back.
              </p>
              <div className="font-mono text-sm text-gray-400 bg-dark-elevated rounded px-3 py-2">
                EGLL → LFPG → EGLL
              </div>
            </div>
            <div className="bg-dark-card border border-dark-border border-l-2 border-l-accent-400 rounded-lg p-6">
              <h3 className="font-semibold text-[#F1F2F4] mb-2">Chain</h3>
              <p className="text-sm text-gray-400 mb-4">
                Multi-hub airlines like Delta. Route across the network — hub to hub with outstation diversions.
              </p>
              <div className="font-mono text-sm text-gray-400 bg-dark-elevated rounded px-3 py-2">
                KATL → KPHX → KJFK → KAUS → KATL
              </div>
            </div>
          </div>
        </section>

        {/* Supported airlines */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-center text-xl font-semibold text-[#F1F2F4] mb-8">Supported airlines</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {airlines.map((a) => (
              <span
                key={a.icao}
                className="bg-dark-elevated text-gray-400 font-mono text-sm px-3 py-1.5 rounded-md border border-dark-border"
              >
                <span className="text-accent-400 mr-1.5">{a.icao}</span>
                {a.name}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border py-8 text-center">
        <p className="text-gray-500 text-sm">Built for flight sim pilots</p>
      </footer>
    </div>
  )
}
