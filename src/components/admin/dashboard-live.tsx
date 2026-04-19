'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, ShoppingCart, AlertTriangle, Package } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'

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
  const { data, isLoading } = useQuery<LiveData>({
    queryKey:        ['dashboard-live'],
    queryFn:         () => fetch('/api/dashboard/live').then(r => r.json()),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-800 rounded-xl" />
        ))}
      </div>
    )
  }

  const { today, yesterday, recentOrders, hourly, topProducts, lowAlerts } = data
  const maxHourRevenue = Math.max(...hourly.map(h => h.revenue), 1)

  return (
    <div className="space-y-6">
      {/* Live KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Today revenue vs yesterday */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Today's Revenue</p>
          <p className="text-2xl font-bold text-white font-mono">{formatCurrency(today.revenue)}</p>
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
              <span className="text-xs text-gray-500">No sales yesterday</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">Yesterday: {formatCurrency(yesterday.revenue)}</p>
        </div>

        {/* Today orders */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Today's Orders</p>
          <p className="text-2xl font-bold text-white font-mono">{today.orders}</p>
          <div className="flex items-center gap-2 mt-2">
            <ShoppingCart className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">
              {today.orders > 0 ? formatCurrency(today.revenue / today.orders) + ' avg' : 'No orders yet'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Yesterday: {yesterday.orders} orders</p>
        </div>

        {/* Low stock alerts */}
        <div className={cn('border rounded-xl p-5', lowAlerts > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-900 border-gray-800')}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Low Stock Alerts</p>
          <p className={cn('text-2xl font-bold font-mono', lowAlerts > 0 ? 'text-red-400' : 'text-green-400')}>{lowAlerts}</p>
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className={cn('w-4 h-4', lowAlerts > 0 ? 'text-red-400' : 'text-gray-500')} />
            {lowAlerts > 0 ? (
              <Link href="/admin/alerts" className="text-sm text-red-400 hover:text-red-300 transition-colors">
                View alerts →
              </Link>
            ) : (
              <span className="text-sm text-gray-500">All stock healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* Hourly revenue chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Hourly Revenue — Today</h2>
        {hourly.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No sales recorded yet today.</p>
        ) : (
          <div className="relative h-32">
            {/* bars */}
            <div className="absolute inset-0 bottom-5 flex items-end gap-px">
              {Array.from({ length: 24 }, (_, h) => {
                const slot = hourly.find(x => x.hour === h)
                const pct  = slot ? (slot.revenue / maxHourRevenue) * 100 : 0
                return (
                  <div key={h} className="flex-1 flex flex-col justify-end h-full group relative">
                    <div
                      className={`w-full rounded-sm transition-all duration-300 ${slot ? 'bg-amber-500/60 hover:bg-amber-400' : 'bg-gray-800'}`}
                      style={{ height: `${Math.max(pct, slot ? 6 : 2)}%` }}
                    />
                    {slot && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2
                                      bg-gray-800 border border-gray-700 rounded px-2 py-1
                                      text-xs text-white whitespace-nowrap hidden group-hover:block z-10 pointer-events-none">
                        {h}:00 · {formatCurrency(slot.revenue)} · {slot.orders} order{slot.orders !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* x-axis labels */}
            <div className="absolute bottom-0 inset-x-0 flex">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center">
                  {h % 4 === 0 && <span className="text-[9px] text-gray-600">{h}h</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live order feed + top products */}
      <div className="grid grid-cols-2 gap-6">
        {/* Live order feed */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-white">Live Order Feed</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50 max-h-72">
            {recentOrders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No orders today yet.</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/40 transition-colors">
                <div>
                  <span className="text-sm font-mono text-white">{o.orderNumber}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{o.customerName} · {o.storeName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-gray-200">{formatCurrency(o.totalAmount)}</p>
                  <span className={cn('text-xs font-medium', STATUS_COLOR[o.status] ?? 'text-gray-400')}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products this week */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col">
          <div className="p-4 border-b border-gray-800 shrink-0">
            <h2 className="font-semibold text-white">Top Products — 7 Days</h2>
          </div>
          <div className="flex-1 p-4 space-y-3 max-h-72 overflow-y-auto">
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No sales data yet.</p>
            ) : (() => {
              const max = Math.max(...topProducts.map(p => p.qty), 1)
              return topProducts.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 truncate max-w-[200px]">{p.name}</span>
                    <span className="text-gray-400 font-mono text-xs ml-2">{p.qty} {p.unit}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
