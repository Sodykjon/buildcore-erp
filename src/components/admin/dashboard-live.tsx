'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, ShoppingCart, AlertTriangle } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { useLang } from '@/i18n/context'

type LiveData = {
  today:    { revenue: number; orders: number; revChange: number | null }
  yesterday:{ revenue: number; orders: number }
  recentOrders: {
    id: string; orderNumber: string; status: string; totalAmount: number
    customerName: string; storeName: string; createdAt: string
  }[]
  hourly:     { hour: number; revenue: number; orders: number }[]
  topProducts:{ name: string; unit: string; qty: number }[]
  lowAlerts:  number
}

const STATUS_COLOR: Record<string, string> = {
  PAID:      'text-blue-400',
  PARTIAL:   'text-amber-400',
  FULFILLED: 'text-green-400',
  CANCELLED: 'text-red-400',
  REFUNDED:  'text-purple-400',
}

export function DashboardLive() {
  const { t } = useLang()
  const { data, isLoading } = useQuery<LiveData>({
    queryKey:        ['dashboard-live'],
    queryFn:         () => fetch('/api/dashboard/live').then(r => r.json()),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        ))}
      </div>
    )
  }

  const { today, yesterday, recentOrders, hourly, topProducts, lowAlerts } = data
  const maxHourRevenue = Math.max(...hourly.map(h => h.revenue), 1)

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t.dashboard.todayRevenue}</p>
          <p className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(today.revenue)}</p>
          <div className="flex items-center gap-2 mt-2">
            {today.revChange !== null ? (
              <>
                {today.revChange >= 0
                  ? <TrendingUp className="w-4 h-4 text-green-400" />
                  : <TrendingDown className="w-4 h-4 text-red-400" />}
                <span className={cn('text-sm font-medium', today.revChange >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {today.revChange >= 0 ? '+' : ''}{today.revChange.toFixed(1)}% vs yesterday
                </span>
              </>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No sales yesterday</span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Yesterday: {formatCurrency(yesterday.revenue)}</p>
        </div>

        <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t.dashboard.activeOrders}</p>
          <p className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{today.orders}</p>
          <div className="flex items-center gap-2 mt-2">
            <ShoppingCart className="w-4 h-4 text-blue-400" />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {today.orders > 0 ? formatCurrency(today.revenue / today.orders) + ' avg' : 'No orders yet'}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Yesterday: {yesterday.orders} orders</p>
        </div>

        <div className={cn('rounded-xl p-5', lowAlerts > 0 ? 'bg-red-500/5' : '')}
             style={{ background: lowAlerts > 0 ? undefined : 'var(--bg-surface)', border: `1px solid ${lowAlerts > 0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}` }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{t.dashboard.lowStockItems}</p>
          <p className={cn('text-2xl font-bold font-mono', lowAlerts > 0 ? 'text-red-400' : 'text-green-400')}>{lowAlerts}</p>
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className={cn('w-4 h-4', lowAlerts > 0 ? 'text-red-400' : '')} style={lowAlerts === 0 ? { color: 'var(--text-muted)' } : {}} />
            {lowAlerts > 0 ? (
              <Link href="/admin/alerts" className="text-sm text-red-400 hover:text-red-300 transition-colors">
                {t.alerts.title} →
              </Link>
            ) : (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>All stock healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* Hourly revenue chart */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t.dashboard.hourlyRevenue} — Today</h2>
        {hourly.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No sales recorded yet today.</p>
        ) : (
          <div className="relative h-32">
            <div className="absolute inset-0 bottom-5 flex items-end gap-px">
              {Array.from({ length: 24 }, (_, h) => {
                const slot = hourly.find(x => x.hour === h)
                const pct  = slot ? (slot.revenue / maxHourRevenue) * 100 : 0
                return (
                  <div key={h} className="flex-1 flex flex-col justify-end h-full group relative">
                    <div
                      className={`w-full rounded-sm transition-all duration-300 ${slot ? 'bg-amber-500/60 hover:bg-amber-400' : ''}`}
                      style={{ height: `${Math.max(pct, slot ? 6 : 2)}%`, background: slot ? undefined : 'var(--bg-elevated)' }}
                    />
                    {slot && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2
                                      rounded px-2 py-1 text-xs text-white whitespace-nowrap hidden group-hover:block z-10 pointer-events-none"
                           style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        {h}:00 · {formatCurrency(slot.revenue)} · {slot.orders} order{slot.orders !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="absolute bottom-0 inset-x-0 flex">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center">
                  {h % 4 === 0 && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{h}h</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live order feed + top products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.dashboard.recentOrders}</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-72" style={{ borderTop: 'none' }}>
            {recentOrders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{t.dashboard.noRecentOrders}</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="px-4 py-3 flex items-center justify-between transition-colors"
                   style={{ borderBottom: '1px solid var(--border)' }}
                   onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                   onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                <div>
                  <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{o.orderNumber}</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{o.customerName} · {o.storeName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(o.totalAmount)}</p>
                  <span className={cn('text-xs font-medium', STATUS_COLOR[o.status] ?? '')} style={!STATUS_COLOR[o.status] ? { color: 'var(--text-secondary)' } : {}}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Top Products — 7 Days</h2>
          </div>
          <div className="flex-1 p-4 space-y-3 max-h-72 overflow-y-auto">
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No sales data yet.</p>
            ) : (() => {
              const max = Math.max(...topProducts.map(p => p.qty), 1)
              return topProducts.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    <span className="font-mono text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{p.qty} {p.unit}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-full bg-amber-500 rounded-full transition-all"
                         style={{ width: `${(p.qty / max) * 100}%` }} />
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
