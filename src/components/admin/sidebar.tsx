'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Package, ArrowLeftRight,
  ShoppingCart, Users, BarChart3, Settings, Store, Warehouse, UserCog, ClipboardList,
  Bell, Truck, ScrollText, LogOut, Shuffle, Car, CreditCard, FileText, Receipt,
  Sun, Moon, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase } from '@/lib/supabase'
import { useLang } from '@/i18n/context'
import { useTheme } from '@/i18n/theme'
import { type Locale } from '@/i18n/translations'
import { useState } from 'react'

type Role = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF'

type NavItem = {
  labelKey: string
  href:     string
  icon:     React.ElementType
  badge?:   boolean
  flagKey?: string
  roles?:   Role[]
}

const nav: NavItem[] = [
  { labelKey: 'dashboard',      href: '/admin',                 icon: LayoutDashboard },
  { labelKey: 'inventory',      href: '/admin/inventory',       icon: Package },
  { labelKey: 'stock',          href: '/admin/stock',           icon: Warehouse },
  { labelKey: 'transfers',      href: '/admin/transfers',       icon: ArrowLeftRight },
  { labelKey: 'rebalancing',    href: '/admin/rebalancing',     icon: Shuffle,       roles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { labelKey: 'workOrders',     href: '/admin/work-orders',     icon: ClipboardList, roles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { labelKey: 'purchaseOrders', href: '/admin/purchase-orders', icon: Truck,         roles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { labelKey: 'orders',         href: '/admin/orders',          icon: ShoppingCart },
  { labelKey: 'alerts',         href: '/admin/alerts',          icon: Bell, badge: true },
  { labelKey: 'customers',      href: '/admin/customers',       icon: Users },
  { labelKey: 'users',          href: '/admin/users',           icon: UserCog,       roles: ['ADMIN'] },
  { labelKey: 'reports',        href: '/admin/reports',         icon: BarChart3,     roles: ['ADMIN'] },
  { labelKey: 'auditLog',       href: '/admin/audit',           icon: ScrollText,    roles: ['ADMIN'] },
  { labelKey: 'stores',         href: '/admin/stores',          icon: Store,         roles: ['ADMIN'] },
  { labelKey: 'settings',       href: '/admin/settings',        icon: Settings,      roles: ['ADMIN'] },
  { labelKey: 'delivery',       href: '/admin/delivery',        icon: Car,        flagKey: 'feature_delivery' },
  { labelKey: 'creditAccounts', href: '/admin/credit',          icon: CreditCard, flagKey: 'feature_credit'   },
  { labelKey: 'quotations',     href: '/admin/quotations',      icon: FileText,   flagKey: 'feature_quotes'   },
  { labelKey: 'invoices',       href: '/admin/invoices',        icon: Receipt,    flagKey: 'feature_ap'       },
]

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
]

export function AdminSidebar() {
  const path   = usePathname()
  const router = useRouter()
  const { t, locale, setLocale } = useLang()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: me } = useQuery<{ role: Role; name: string }>({
    queryKey: ['me'],
    queryFn:  () => fetch('/api/me').then(r => r.json()),
    staleTime: 5 * 60_000,
  })
  const role = me?.role ?? 'STAFF'

  const { data: alertData } = useQuery<{ count: number }>({
    queryKey:        ['alert-count'],
    queryFn:         () => fetch('/api/alerts/unread-count').then(r => r.json()),
    refetchInterval: 60_000,
  })
  const alertCount = alertData?.count ?? 0

  const { data: flags } = useQuery<Record<string, boolean>>({
    queryKey:        ['feature-flags'],
    queryFn:         () => fetch('/api/feature-flags').then(r => r.json()),
    staleTime:       60_000,
    refetchInterval: 120_000,
  })

  const visibleNav = nav.filter(item => {
    if (item.flagKey && !(flags && flags[item.flagKey])) return false
    if (item.roles && !item.roles.includes(role)) return false
    return true
  })

  async function handleLogout() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <aside
      className="w-60 flex flex-col shrink-0 h-full"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>BuildCore</span>
          <span className="ml-2 text-xs font-medium" style={{ color: 'var(--accent)' }}>{t.roles[role]}</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
        {visibleNav.map(({ labelKey, href, icon: Icon, badge, flagKey }) => {
          const active    = path === href || (href !== '/admin' && path.startsWith(href))
          const showBadge = badge && alertCount > 0
          const isOptional = !!flagKey
          const label = (t.nav as Record<string, string>)[labelKey] ?? labelKey
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              )}
              style={active
                ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                : { color: 'var(--text-secondary)' }
              }
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = '' } }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isOptional && !active && (
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.common.beta}</span>
              )}
              {showBadge && (
                <span className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  active ? 'bg-black/20' : 'bg-red-500 text-white'
                )}>
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Language + Theme controls */}
      <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1">
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              className="flex-1 text-xs py-1 rounded font-medium transition-colors"
              style={locale === l.code
                ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                : { color: 'var(--text-muted)', background: 'var(--bg-elevated)' }
              }
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            title={theme === 'dark' ? t.settings.lightMode : t.settings.darkMode}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs transition-colors hover:text-red-400"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut className="w-3.5 h-3.5" /> {t.nav.signOut}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        'lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        {sidebarContent}
      </div>
    </>
  )
}
