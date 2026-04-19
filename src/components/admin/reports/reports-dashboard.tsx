'use client'

import { useRouter, usePathname } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, ShoppingCart, Package, Star, ClipboardList, Warehouse, Download } from 'lucide-react'

type DailyRevenue    = { day: string; revenue: number; orders: number }
type StoreRevenue    = { storeName: string; revenue: number; orders: number }
type TopProduct      = { name: string; unit: string; qty: number }
type InventoryValue  = { storeName: string; value: number; units: number }
type LoyaltyStats    = { earned: number; redeemed: number; txCount: number }
type Summary         = { revenue: number; orders: number; avgOrder: number; pendingWOs: number }

interface Props {
  from: string; to: string
  summary:        Summary
  dailyRevenue:   DailyRevenue[]
  revenueByStore: StoreRevenue[]
  topProducts:    TopProduct[]
  inventoryValue: InventoryValue[]
  loyaltyStats:   LoyaltyStats
}

export function ReportsDashboard({
  from, to, summary, dailyRevenue, revenueByStore, topProducts, inventoryValue, loyaltyStats,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  function applyDates(f: string, t: string) {
    router.push(`${pathname}?from=${f}&to=${t}`)
  }

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1)
  const totalInventoryValue = inventoryValue.reduce((s, r) => s + r.value, 0)

  return (
    <div className="space-y-6">
      {/* Header + date filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Revenue, inventory & loyalty analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: 'Today',    days: 0 },
            { label: '7 days',   days: 7 },
            { label: '30 days',  days: 30 },
            { label: '90 days',  days: 90 },
          ].map(({ label, days }) => (
            <button key={label} onClick={() => {
              const end   = new Date()
              const start = new Date()
              start.setDate(start.getDate() - days)
              applyDates(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10))
            }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700
                         text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
              {label}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <input type="date" defaultValue={from}
              onChange={e => applyDates(e.target.value, to)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300
                         outline-none focus:border-amber-500 transition-colors" />
            <span className="text-gray-600 text-xs">to</span>
            <input type="date" defaultValue={to}
              onChange={e => applyDates(from, e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300
                         outline-none focus:border-amber-500 transition-colors" />
          </div>
          <a
            href={`/api/reports/export?from=${from}&to=${to}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors ml-1"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Revenue" value={formatCurrency(summary.revenue)} icon={<TrendingUp className="w-5 h-5" />} accent="green" />
        <KpiCard label="Orders" value={summary.orders} icon={<ShoppingCart className="w-5 h-5" />} accent="blue" />
        <KpiCard label="Avg Order" value={formatCurrency(summary.avgOrder)} icon={<ShoppingCart className="w-5 h-5" />} accent="amber" />
        <KpiCard label="Pending WOs" value={summary.pendingWOs} icon={<ClipboardList className="w-5 h-5" />} accent={summary.pendingWOs > 0 ? 'red' : 'green'} />
      </div>

      {/* Revenue chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Daily Revenue</h2>
        {dailyRevenue.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No revenue in this period.</p>
        ) : (
          <div className="space-y-2">
            {dailyRevenue.map(d => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 shrink-0">{d.day}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full bg-amber-500/70 rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max(2, (d.revenue / maxRevenue) * 100)}%` }}
                  >
                    <span className="text-xs text-gray-950 font-semibold hidden sm:block">
                      {d.revenue >= 1000 ? `$${(d.revenue / 1000).toFixed(1)}k` : `$${d.revenue.toFixed(0)}`}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{d.orders} orders</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Revenue by store */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Revenue by Store</h2>
          {revenueByStore.length === 0 ? (
            <p className="text-sm text-gray-500">No data.</p>
          ) : (
            <div className="space-y-3">
              {revenueByStore
                .sort((a, b) => b.revenue - a.revenue)
                .map(r => (
                  <div key={r.storeName} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 truncate">{r.storeName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-500">{r.orders} orders</span>
                      <span className="text-sm font-semibold text-green-400 font-mono w-24 text-right">
                        {formatCurrency(r.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Top Products Sold</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No data.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-4 shrink-0">{i + 1}.</span>
                  <span className="text-sm text-gray-300 flex-1 truncate">{p.name}</span>
                  <span className="text-sm font-semibold text-amber-400 font-mono">
                    {p.qty} <span className="text-xs text-gray-500">{p.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory value */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Inventory Value</h2>
            <span className="text-sm font-bold text-amber-400">{formatCurrency(totalInventoryValue)}</span>
          </div>
          {inventoryValue.length === 0 ? (
            <p className="text-sm text-gray-500">No inventory.</p>
          ) : (
            <div className="space-y-3">
              {inventoryValue.map(r => (
                <div key={r.storeName} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{r.storeName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{r.units.toLocaleString()} units</span>
                    <span className="text-sm font-semibold text-white font-mono w-24 text-right">
                      {formatCurrency(r.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loyalty stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Loyalty Programme</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-xl font-bold text-white">{loyaltyStats.txCount}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Points Earned</p>
                <p className="text-lg font-bold text-green-400 font-mono">+{loyaltyStats.earned.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Points Redeemed</p>
                <p className="text-lg font-bold text-amber-400 font-mono">−{loyaltyStats.redeemed.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Net Points Issued</p>
              <p className="text-lg font-bold text-white font-mono">
                {(loyaltyStats.earned - loyaltyStats.redeemed).toLocaleString()}
                <span className="text-xs text-gray-500 font-normal ml-2">
                  ≈ {formatCurrency((loyaltyStats.earned - loyaltyStats.redeemed) * 0.01)} liability
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, accent }: {
  label: string; value: string | number; icon: React.ReactNode
  accent: 'green' | 'blue' | 'amber' | 'red'
}) {
  const colors = {
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
    blue:  'border-blue-500/30  bg-blue-500/10  text-blue-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    red:   'border-red-500/30   bg-red-500/10   text-red-400',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[accent]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  )
}
