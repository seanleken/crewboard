'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Plane, LayoutDashboard, ClipboardList, Settings, LogOut, Menu, X } from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Schedules', icon: ClipboardList, href: '/dashboard/schedules' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

function NavItem({ label, icon: Icon, href, onClick }: { label: string; icon: React.ElementType; href: string; onClick?: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors relative ${
        isActive
          ? 'text-accent-400 bg-dark-elevated'
          : 'text-gray-400 hover:text-[#F1F2F4] hover:bg-dark-elevated'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-400 rounded-full" />
      )}
      <Icon size={17} strokeWidth={1.5} />
      {label}
    </Link>
  )
}

export default function Sidebar({ email }: { email: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-dark-border">
        <Plane size={17} className="text-accent-400" strokeWidth={1.5} />
        <span className="font-bold text-lg text-[#F1F2F4]">CrewBoard</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      {/* User area */}
      <div className="px-3 py-4 border-t border-dark-border space-y-1">
        <p className="text-xs text-gray-500 px-4 py-1 truncate">{email}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-gray-400 hover:text-[#F1F2F4] hover:bg-dark-elevated transition-colors"
          >
            <LogOut size={17} strokeWidth={1.5} />
            Log out
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-dark-sidebar min-h-screen border-r border-dark-border fixed top-0 left-0 bottom-0">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-dark-sidebar border-b border-dark-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Plane size={16} className="text-accent-400" strokeWidth={1.5} />
          <span className="font-bold text-[#F1F2F4]">CrewBoard</span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-gray-400 hover:text-[#F1F2F4] p-1"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-14 left-0 bottom-0 z-50 w-64 bg-dark-sidebar border-r border-dark-border">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
