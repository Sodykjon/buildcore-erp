'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Package, ArrowLeftRight,
  ShoppingCart, Users, BarChart3, Settings, Store, Warehouse, UserCog, ClipboardList,
  Bell, Truck, ScrollText, LogOut, Shuffle, Car, CreditCard, FileText, Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase } from '@/lib/supabase'

type Role = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF'

type NavItem = {
  label:    string
  href:     string
  icon:     React.ElementType
  badge?:   boolean
  flagKey?: string
  roles?:   Role[]  // undefined = all roles
}

const nav: NavItem[] = [
  { label: 'Dashboard',       href: '/admin',                 icon: LayoutDashboard },
  { label: 'Inventory',       href: '/admin/inventory',       icon: Package },
  { label: 'Stock',           href: '/admin/stock',           icon: Warehouse },
  { label: 'Transfers',       href: '/admin/transfers',       icon: ArrowLeftRight },
  { label: 'Rebalancing',     href: '/admin/rebalancing',     icon: Shuffle,       roles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { label: 'Work Orders',     href: '/admin/work-orders',     icon: ClipboardList, roles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { label: 'Purchase Orders', href: '/admin/purchase-orders', icon: Truck,         roles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { label: 'Orders',          href: '/admin/orders',          icon: ShoppingCart },
  { label: 'Alerts',          href: '/admin/alerts',          icon: Bell, badge: true },
  { label: 'Customers',       href: '/admin/customers',       icon: Users },
  { label: 'Users',           href: '/admin/users',           icon: UserCog,       roles: ['ADMIN'] },
  { label: 'Reports',         href: '/admin/reports',         icon: BarChart3,     roles: ['ADMIN'] },
  { label: 'Audit Log',       href: '/admin/audit',           icon: ScrollText,    roles: ['ADMIN'] },
  { label: 'Stores',          href: '/admin/stores',          icon: Store,         roles: ['ADMIN'] },
  { label: 'Settings',        href: '/admin/settings',        icon: Settings,      roles: ['ADMIN'] },
  // Optional — shown only when flag is enabled
  { label: 'Delivery',        href: '/admin/delivery',        icon: Car,        flagKey: 'feature_delivery' },
  { label: 'Credit Accounts', href: '/admin/credit',          icon: CreditCard, flagKey: 'feature_credit'   },
  { label: 'Quotations',      href: '/admin/quotations',      icon: FileText,   flagKey: 'feature_quotes'   },
  { label: 'Invoices (AP)',   href: '/admin/invoices',        icon: Receipt,    flagKey: 'feature_ap'       },
]

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:             'Admin',
  WAREHOUSE_MANAGER: 'Manager',
  STAFF:             'Staff',
}

export function AdminSidebar() {
  const path   = usePathname()
  const router = useRouter()

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

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-lg font-bold tracking-tight text-white">BuildCore</span>
        <span className="ml-2 text-xs text-amber-400 font-medium">{ROLE_LABELS[role]}</span>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
        {visibleNav.map(({ label, href, icon: Icon, badge, flagKey }) => {
          const active    = path === href || (href !== '/admin' && path.startsWith(href))
          const showBadge = badge && alertCount > 0
          const isOptional = !!flagKey
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-amber-500 text-gray-950'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isOptional && !active && (
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Beta</span>
              )}
              {showBadge && (
                <span className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  active ? 'bg-gray-950/30 text-gray-950' : 'bg-red-500 text-white'
                )}>
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
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
