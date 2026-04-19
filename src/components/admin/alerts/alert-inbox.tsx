'use client'

import { useState, useTransition } from 'react'
import { Bell, BellOff, CheckCheck, AlertTriangle } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { markAlertReadAction, markAllAlertsReadAction } from '@/app/actions/alerts'

type Alert = {
  id: string; storeId: string; productId: string; quantity: number
  isRead: boolean; createdAt: string
  store: { name: string }
  product: { name: string; sku: string; unit: string }
}

export function AlertInbox({ alerts: initial }: { alerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initial)
  const [showRead, setShowRead] = useState(false)
  const [, startTrans] = useTransition()

  const unread  = alerts.filter(a => !a.isRead)
  const visible = showRead ? alerts : unread

  function markRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
    startTrans(() => markAlertReadAction(id))
  }

  function markAll() {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
    startTrans(() => markAllAlertsReadAction())
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Low Stock Alerts</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unread.length > 0 ? `${unread.length} unread alert${unread.length > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRead(s => !s)}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            {showRead ? 'Hide read' : `Show all (${alerts.length})`}
          </button>
          {unread.length > 0 && (
            <button
              onClick={markAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                         bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <BellOff className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-gray-500">
            {showRead ? 'No alerts yet.' : 'No unread alerts. '}
            {!showRead && alerts.length > 0 && (
              <button onClick={() => setShowRead(true)} className="text-amber-400 hover:text-amber-300">
                Show read alerts
              </button>
            )}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {visible.map(alert => (
          <div
            key={alert.id}
            className={cn(
              'bg-gray-900 border rounded-xl px-5 py-4 flex items-center gap-4 transition-all',
              alert.isRead
                ? 'border-gray-800 opacity-60'
                : 'border-red-500/30 bg-red-500/5'
            )}
          >
            <AlertTriangle className={cn('w-5 h-5 shrink-0', alert.isRead ? 'text-gray-600' : 'text-red-400')} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{alert.product.name}</p>
                <span className="text-xs text-gray-500 font-mono">{alert.product.sku}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {alert.store.name} ·{' '}
                <span className="text-red-400 font-mono font-semibold">{alert.quantity}</span>{' '}
                {alert.product.unit} on hand · {formatDate(alert.createdAt)}
              </p>
            </div>
            {!alert.isRead && (
              <button
                onClick={() => markRead(alert.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600
                           transition-colors shrink-0"
              >
                <Bell className="w-3.5 h-3.5" /> Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
