'use client'

import { useState, useTransition } from 'react'
import { Users, Plus, Pencil, Star, ToggleLeft, ToggleRight, History } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatDate, cn } from '@/lib/utils'
import {
  createCustomerAction, updateCustomerAction,
  deactivateCustomerAction, adjustLoyaltyAction,
} from '@/app/actions/customers'

type LoyaltyTx = { id: string; type: string; points: number; note: string | null; createdAt: string }
type Customer  = {
  id: string; fullName: string; phone: string; email: string | null
  loyaltyPoints: number; isActive: boolean; orderCount: number
  createdAt: string; loyaltyTxs: LoyaltyTx[]
}

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`
const labelCls = 'block text-xs text-gray-500 mb-1'

export function CustomerManager({ customers: initial }: { customers: Customer[] }) {
  const [customers, setCustomers]   = useState(initial)
  const [search, setSearch]         = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [addOpen, setAddOpen]       = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [loyaltyTarget, setLoyaltyTarget] = useState<Customer | null>(null)
  const [error, setError]           = useState<string | null>(null)
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
      await deactivateCustomerAction(c.id, !c.isActive)
      setCustomers(cs => cs.map(x => x.id === c.id ? { ...x, isActive: !c.isActive } : x))
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{visible.length} customers</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
                       text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 w-48"
          />
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showInactive
                ? 'bg-gray-600/20 text-gray-300 border-gray-600/30'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-right px-4 py-3 font-medium">Points</th>
              <th className="text-right px-4 py-3 font-medium">Orders</th>
              <th className="text-left px-4 py-3 font-medium">Since</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {visible.map(c => (
              <tr key={c.id} className={`hover:bg-gray-800/40 transition-colors ${!c.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-white">{c.fullName}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-3 text-gray-400">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-amber-400 font-mono font-semibold">{c.loyaltyPoints}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{c.orderCount}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.createdAt)}</td>
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
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Customer" size="sm">
        <CustomerForm onDone={() => { setAddOpen(false); reload() }} setError={setError} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Customer" size="sm">
        {editTarget && (
          <CustomerForm customer={editTarget} onDone={() => { setEditTarget(null); reload() }} setError={setError} />
        )}
      </Modal>

      <Modal open={!!loyaltyTarget} onClose={() => setLoyaltyTarget(null)} title="Loyalty Points" size="md">
        {loyaltyTarget && (
          <LoyaltyPanel
            customer={loyaltyTarget}
            onDone={() => { setLoyaltyTarget(null); reload() }}
            setError={setError}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Customer form ─────────────────────────────────────────────────────────────

function CustomerForm({ customer, onDone, setError }: {
  customer?: Customer; onDone: () => void; setError: (e: string | null) => void
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
        } else {
          await createCustomerAction(fd)
        }
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Full Name *</label>
        <input name="fullName" required defaultValue={customer?.fullName} className={inputCls} placeholder="John Doe" />
      </div>
      <div>
        <label className={labelCls}>Phone *</label>
        <input name="phone" required defaultValue={customer?.phone} className={inputCls} placeholder="+1 555 000 0000" />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" defaultValue={customer?.email ?? ''} className={inputCls} placeholder="john@email.com" />
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

function LoyaltyPanel({ customer, onDone, setError }: {
  customer: Customer; onDone: () => void; setError: (e: string | null) => void
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
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); setError(msg)
      }
    })
  }

  const typeColor: Record<string, string> = {
    EARN: 'text-green-400', REDEEM: 'text-amber-400', ADJUSTMENT: 'text-blue-400',
  }
  const typeBg: Record<string, string> = {
    EARN: 'bg-green-500/10', REDEEM: 'bg-amber-500/10', ADJUSTMENT: 'bg-blue-500/10',
  }

  // compute running balance (txs are newest-first, reverse for running total)
  const txsOldFirst = [...customer.loyaltyTxs].reverse()
  let runningBalance = 0
  const txsWithBalance = txsOldFirst.map(tx => {
    runningBalance += tx.points
    return { ...tx, balance: runningBalance }
  }).reverse()

  const visibleTxs = showAll ? txsWithBalance : txsWithBalance.slice(0, 10)

  const totalEarned   = customer.loyaltyTxs.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0)
  const totalRedeemed = customer.loyaltyTxs.filter(t => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0)

  return (
    <div className="space-y-4">
      {/* Balance header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{customer.fullName}</p>
            <p className="text-3xl font-bold text-amber-400 font-mono mt-1">{customer.loyaltyPoints} pts</p>
            <p className="text-xs text-gray-500 mt-1">≈ ${(customer.loyaltyPoints * 0.01).toFixed(2)} value</p>
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-xs text-gray-500">Total Earned</p>
              <p className="text-sm font-semibold text-green-400 font-mono">+{totalEarned}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Redeemed</p>
              <p className="text-sm font-semibold text-amber-400 font-mono">−{totalRedeemed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
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
              <label className={labelCls}>Points (+ to add, − to deduct)</label>
              <input name="points" type="number" required className={inputCls} placeholder="e.g. 100 or -50" />
            </div>
            <div>
              <label className={labelCls}>Note *</label>
              <input name="note" required className={inputCls} placeholder="Reason for adjustment…" />
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
              <p className="text-gray-500 text-sm">No loyalty transactions yet.</p>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {visibleTxs.map(tx => (
              <div key={tx.id} className={cn('rounded-lg px-3 py-2.5 text-xs', typeBg[tx.type] ?? 'bg-gray-800')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold text-xs px-1.5 py-0.5 rounded', typeColor[tx.type])}>
                      {tx.type}
                    </span>
                    {tx.note && <span className="text-gray-400">{tx.note}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn('font-mono font-bold', tx.points >= 0 ? 'text-green-400' : 'text-amber-400')}>
                      {tx.points >= 0 ? '+' : ''}{tx.points}
                    </span>
                    <span className="text-gray-600 font-mono">= {tx.balance}</span>
                  </div>
                </div>
                <p className="text-gray-600 mt-1">{formatDate(tx.createdAt)}</p>
              </div>
            ))}
          </div>
          {txsWithBalance.length > 10 && (
            <button onClick={() => setShowAll(s => !s)}
              className="w-full text-xs text-gray-500 hover:text-amber-400 transition-colors py-1">
              {showAll ? 'Show less' : `Show all ${txsWithBalance.length} transactions`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
