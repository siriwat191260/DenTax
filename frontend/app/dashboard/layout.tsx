'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, List, BarChart2, Receipt } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard/scan',    icon: Camera,   label: 'สแกนใบเสร็จ' },
  { href: '/dashboard/records', icon: List,     label: 'รายการรายได้' },
  { href: '/dashboard/summary', icon: BarChart2, label: 'สรุปรายได้'  },
  { href: '/dashboard/tax',     icon: Receipt,  label: 'คำนวณภาษี'   },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-teal-900 text-lg">🦷</span>
            <div>
              <p className="text-sm font-medium text-gray-900">DentaLedger</p>
              <p className="text-xs text-gray-400">ระบบรายได้ทันตแพทย์</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-2">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-lg',
                pathname === href
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">v0.1.0 · Portfolio</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
