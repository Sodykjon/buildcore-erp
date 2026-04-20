'use client'

import { useState, useTransition } from 'react'
import { Users, Plus, Pencil, Star, ToggleLeft, ToggleRight, History } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatDate, cn } from '@/lib/utils'
import {
  createCustomerAction, updateCustomerAction,
  deactivateCustomerAction, adjustLoyaltyAction,
} from '@/app/actions/customers'
import { toast } from 'sonner'

type LoyaltyTx = { id: string; type: string; points: number; note: string | null; createdAt: string }
type Customer  = {
  id: string; fullName: string; phone: string; email: string | null
  loyaltyPoints: number; isActive: boolean; orderCount: number
  createdAt: string; loyaltyTxs: LoyaltyTx[]
}

const inputCls = `w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors`
const labelCls = 'block text-xs mb-1'

export function CustomerManager({ customers: initial }: { customers: Customer[] }) {
  const [customers, setCustomers]   = useState(initial)
  const [search, setSearch]         = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [addOpen, setAddOpen]       = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [loyaltyTarget, setLoyaltyTarget] = useState<Customer | null>(null)
  const [, startTrans]              = useTransition()

  function reload() { window.location.reload() }

  const visible = customers.filter(c =>
    (showInactive ? !c.isActive : c.isActive) &&
    (search === '' ||
     c.fullName.toLowerCase().includes(search.toLowerCase()) ||
     c.phone.includes(search))
  )

  async function handleToggleActive(c: Customer) {
    startTrans(async () => {
      try {
        await deactivateCustomerAction(c.id, !c.isActive)
        setCustomers(cs => cs.map(x => x.id === c.id ? { ...x, isActive: !c.isActive } : x))
        toast.success(c.isActive ? 'Customer deactivated' : 'Customer activated')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Error')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Customers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{visible.length} customers</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 w-48"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => setShowInactive(v => !v)}
            className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={showInactive
              ? { background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {showInactive ? 'Show Active' : 'Show Inactive'}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                       bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-right px-4 py-3 font-medium">Points</th>
              <th className="text-right px-4 py-3 font-medium">Orders</th>
              <th className="text-left px-4 py-3 font-medium">Since</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map(c => (
              <tr key={c.id} className={`transition-colors hover:bg-gray-800/40 ${!c.isActive ? 'opacity-50' : ''}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{c.fullName}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-amber-400 font-mono font-semibold">{c.loyaltyPoints}</span>
                </td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{c.orderCount}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setLoyaltyTarget(c)}
                      className="text-gray-500 hover:text-amber-400 transition-colors" title="Loyalty">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditTarget(c)}
                      className="text-gray-500 hover:text-blue-400 transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleActive(c)}
                      className={`transition-colors ${c.isActive ? 'text-green-400 hover:text-red-400' : 'text-gray-600 hover:text-green-400'}`}
                      title={c.isActive ? 'Deactivate' : 'Activate'}>
                      {c.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Customer" size="sm">
        <CustomerForm onDone={() => { setAddOpen(false); reload() }} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Customer" size="sm">
        {editTarget && (
          <CustomerForm customer={editTarget} onDone={() => { setEditTarget(null); reload() }} />
        )}
      </Modal>

      <Modal open={!!loyaltyTarget} onClose={() => setLoyaltyTarget(null)} title="Loyalty Points" size="md">
        {loyaltyTarget && (
          <LoyaltyPanel
            customer={loyaltyTarget}
            onDone={() => { setLoyaltyTarget(null); reload() }}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Customer form ─────────────────────────────────────────────────────────────

function CustomerForm({ customer, onDone }: {
  customer?: Customer; onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTrans(async () => {
      try {
        setErr(null)
        if (customer) {
          fd.set('id', customer.id)
          await updateCustomerAction(fd)
          toast.success('Customer updated')
        } else {
          await createCustomerAction(fd)
          toast.success('Customer created')
        }
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); toast.error(msg)
      }
    })
  }

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls} style={labelStyle}>Full Name *</label>
        <input name="fullName" required defaultValue={customer?.fullName} className={inputCls} placeholder="John Doe" style={inputStyle} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Phone *</label>
        <input name="phone" required defaultValue={customer?.phone} className={inputCls} placeholder="+1 555 000 0000" style={inputStyle} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Email</label>
        <input name="email" type="email" defaultValue={customer?.email ?? ''} className={inputCls} placeholder="john@email.com" style={inputStyle} />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Saving…' : customer ? 'Save Changes' : 'Create Customer'}
      </button>
    </form>
  )
}

// ── Loyalty panel ─────────────────────────────────────────────────────────────

function LoyaltyPanel({ customer, onDone }: {
  customer: Customer; onDone: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [err, setErr]         = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [tab, setTab]         = useState<'adjust' | 'history'>('history')

  function handleAdjust(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('customerId', customer.id)
    startTrans(async () => {
      try {
        setErr(null)
        await adjustLoyaltyAction(fd)
        toast.success('Loyalty points adjusted')
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); toast.error(msg)
      }
    })
  }

  const typeColor: Record<string, string> = {
    EARN: 'text-green-400', REDEEM: 'text-amber-400', ADJUSTMENT: 'text-blue-400',
  }
  const typeBg: Record<string, string> = {
    EARN: 'bg-green-500/10', REDEEM: 'bg-amber-500/10', ADJUSTMENT: 'bg-blue-500/10',
  }

  const txsOldFirst = [...customer.loyaltyTxs].reverse()
  let runningBalance = 0
  const txsWithBalance = txsOldFirst.map(tx => {
    runningBalance += tx.points
    return { ...tx, balance: runningBalance }
  }).reverse()

  const visibleTxs = showAll ? txsWithBalance : txsWithBalance.slice(0, 10)

  const totalEarned   = customer.loyaltyTxs.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0)
  const totalRedeemed = customer.loyaltyTxs.filter(t => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0)

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <div className="space-y-4">
      {/* Balance header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{customer.fullName}</p>
            <p className="text-3xl font-bold text-amber-400 font-mono mt-1">{customer.loyaltyPoints} pts</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>≈ ${(customer.loyaltyPoints * 0.01).toFixed(2)} value</p>
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Earned</p>
              <p className="text-sm font-semibold text-green-400 font-mono">+{totalEarned}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Redeemed</p>
              <p className="text-sm font-semibold text-amber-400 font-mono">−{totalRedeemed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-elevated)' }}>
        {(['history', 'adjust'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
              tab === t ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300')}>
            {t === 'history' ? 'Transaction History' : 'Manual Adjustment'}
          </button>
        ))}
      </div>

      {tab === 'adjust' && (
        <form onSubmit={handleAdjust} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>Points (+ to add, − to deduct)</label>
              <input name="points" type="number" required className={inputCls} placeholder="e.g. 100 or -50" style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Note *</label>
              <input name="note" required className={inputCls} placeholder="Reason for adjustment…" style={inputStyle} />
            </div>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button type="submit" disabled={pending}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
            {pending ? 'Saving…' : 'Apply Adjustment'}
          </button>
        </form>
      )}

      {tab === 'history' && (
        <div className="space-y-1.5">
          {txsWithBalance.length === 0 && (
            <div className="text-center py-8">
              <History className="w-8 h-8 mx-auto mb-2 text-gray-700" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No loyalty transactions yet.</p>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {visibleTxs.map(tx => (
              <div key={tx.id} className={cn('rounded-lg px-3 py-2.5 text-xs', typeBg[tx.type] ?? '')} style={!typeBg[tx.type] ? { background: 'var(--bg-elevated)' } : {}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold text-xs px-1.5 py-0.5 rounded', typeColor[tx.type])}>
                      {tx.type}
                    </span>
                    {tx.note && <span style={{ color: 'var(--text-secondary)' }}>{tx.note}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn('font-mono font-bold', tx.points >= 0 ? 'text-green-400' : 'text-amber-400')}>
                      {tx.points >= 0 ? '+' : ''}{tx.points}
                    </span>
                    <span className="font-mono" style={{ color: 'var(--text-muted)' }}>= {tx.balance}</span>
                  </div>
                </div>
                <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.createdAt)}</p>
              </div>
            ))}
          </div>
          {txsWithBalance.length > 10 && (
            <button onClick={() => setShowAll(s => !s)}
              className="w-full text-xs hover:text-amber-400 transition-colors py-1" style={{ color: 'var(--text-muted)' }}>
              {showAll ? 'Show less' : `Show all ${txsWithBalance.length} transactions`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
