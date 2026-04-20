'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PackageCheck, ArrowLeftRight, Warehouse, ClipboardList, Settings, LogOut, Sun, Moon, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLang } from '@/i18n/context'
import { useTheme } from '@/i18n/theme'
import { type Locale } from '@/i18n/translations'
import { useState } from 'react'

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
]

export function WarehouseSidebar({ storeName, userName }: { storeName: string; userName: string }) {
  const path   = usePathname()
  const router = useRouter()
  const { t, locale, setLocale } = useLang()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = [
    { label: t.warehouse.fulfillment, href: '/warehouse/fulfillment',  icon: PackageCheck },
    { label: t.nav.transfers,         href: '/warehouse/transfers',    icon: ArrowLeftRight },
    { label: t.nav.inventory,         href: '/warehouse/inventory',    icon: Warehouse },
    { label: t.nav.workOrders,        href: '/warehouse/work-orders',  icon: ClipboardList },
    { label: t.nav.settings,          href: '/warehouse/settings',     icon: Settings },
  ]

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <aside className="w-60 flex flex-col shrink-0 h-full" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
      <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>BuildCore</span>
          <span className="ml-2 text-xs text-blue-400 font-medium">{t.warehouse.title.toUpperCase()}</span>
          <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{storeName}</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 rounded" style={{ color: 'var(--text-secondary)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3">
        {nav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors')}
            style={path === href || path.startsWith(href + '/')
              ? { background: '#3b82f6', color: '#fff' }
              : { color: 'var(--text-secondary)' }
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1 mb-2">
          {LOCALES.map(l => (
            <button key={l.code} onClick={() => setLocale(l.code)}
              className="flex-1 text-xs py-1 rounded font-medium transition-colors"
              style={locale === l.code
                ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
              }>
              {l.label}
            </button>
          ))}
          <button onClick={toggleTheme} className="p-1.5 rounded transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{userName}</p>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs transition-colors hover:text-red-400" style={{ color: 'var(--text-muted)' }}>
          <LogOut className="w-3.5 h-3.5" /> {t.nav.signOut}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
        <Menu className="w-5 h-5" />
      </button>
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />}
      <div className={cn('lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        {sidebarContent}
      </div>
      <div className="hidden lg:flex">{sidebarContent}</div>
    </>
  )
}
