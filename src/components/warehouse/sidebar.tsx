'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PackageCheck, ArrowLeftRight, Warehouse, ClipboardList, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const nav = [
  { label: 'Fulfillment',  href: '/warehouse/fulfillment',  icon: PackageCheck },
  { label: 'Transfers',    href: '/warehouse/transfers',    icon: ArrowLeftRight },
  { label: 'Inventory',    href: '/warehouse/inventory',    icon: Warehouse },
  { label: 'Work Orders',  href: '/warehouse/work-orders',  icon: ClipboardList },
  { label: 'Settings',    href: '/warehouse/settings',     icon: Settings },
]

export function WarehouseSidebar({ storeName, userName }: { storeName: string; userName: string }) {
  const path   = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-lg font-bold tracking-tight text-white">BuildCore</span>
        <span className="ml-2 text-xs text-blue-400 font-medium">WAREHOUSE</span>
        <p className="text-xs text-gray-500 mt-1 truncate">{storeName}</p>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3">
        {nav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              path === href || path.startsWith(href + '/')
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <p className="text-xs text-gray-500 truncate">{userName}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </aside>
  )
}
