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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Low Stock Alerts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {unread.length > 0 ? `${unread.length} unread alert${unread.length > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRead(s => !s)} className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            {showRead ? 'Hide read' : `Show all (${alerts.length})`}
          </button>
          {unread.length > 0 && (
            <button onClick={markAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 && (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <BellOff className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>
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
            className={cn('rounded-xl px-5 py-4 flex items-center gap-4 transition-all', alert.isRead ? 'opacity-60' : '')}
            style={{
              background: alert.isRead ? 'var(--bg-surface)' : 'rgba(239,68,68,0.05)',
              border: `1px solid ${alert.isRead ? 'var(--border)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <AlertTriangle className={cn('w-5 h-5 shrink-0', alert.isRead ? '' : 'text-red-400')}
              style={alert.isRead ? { color: 'var(--text-muted)' } : {}} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{alert.product.name}</p>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{alert.product.sku}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {alert.store.name} ·{' '}
                <span className="text-red-400 font-mono font-semibold">{alert.quantity}</span>{' '}
                {alert.product.unit} on hand · {formatDate(alert.createdAt)}
              </p>
            </div>
            {!alert.isRead && (
              <button onClick={() => markRead(alert.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <Bell className="w-3.5 h-3.5" /> Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
