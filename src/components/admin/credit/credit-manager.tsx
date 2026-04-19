'use client'

import { useState, useTransition } from 'react'
import { CreditCard, Plus, CheckCircle2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { cn, formatCurrency } from '@/lib/utils'
import {
  createCreditAccountAction, recordCreditPaymentAction, toggleCreditAccountAction,
} from '@/app/actions/credit'

type CreditTx = { id: string; type: string; amount: number; note: string | null; createdAt: string }
type Account = {
  id: string; creditLimit: number; currentBalance: number; terms: number; isActive: boolean
  createdAt: string
  customer:     { id: string; fullName: string; phone: string }
  transactions: CreditTx[]
}
type Customer = { id: string; fullName: string; phone: string }

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`

export function CreditManager({ accounts: initial, customers }: {
  accounts:  Account[]
  customers: Customer[]
}) {
  const [accounts, setAccounts] = useState(initial)
  const [addOpen, setAddOpen]   = useState(false)
  const [payTarget, setPayTarget] = useState<Account | null>(null)
  const [detail, setDetail]     = useState<Account | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [, startTrans]          = useTransition()

  async function handleCreate(fd: FormData) {
    startTrans(async () => {
      try {
        await createCreditAccountAction(fd)
        setAddOpen(false)
        window.location.reload()
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  async function handlePayment(fd: FormData) {
    startTrans(async () => {
      try {
        await recordCreditPaymentAction(fd)
        setPayTarget(null)
        window.location.reload()
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  async function handleToggle(id: string, isActive: boolean) {
    startTrans(async () => {
      await toggleCreditAccountAction(id, !isActive)
      setAccounts(as => as.map(a => a.id === id ? { ...a, isActive: !isActive } : a))
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit Accounts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{accounts.length} accounts</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                     bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors">
          <Plus className="w-4 h-4" /> New Account
        </button>
      </div>

      {error && <p className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">{error}</p>}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-right px-4 py-3 font-medium">Credit Limit</th>
              <th className="text-right px-4 py-3 font-medium">Balance Owed</th>
              <th className="text-right px-4 py-3 font-medium">Available</th>
              <th className="text-left px-4 py-3 font-medium">Terms</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {accounts.map(a => {
              const available = a.creditLimit - a.currentBalance
              const overLimit = a.currentBalance > a.creditLimit
              return (
                <tr key={a.id} className={cn('transition-colors', a.isActive ? 'hover:bg-gray-800/40' : 'opacity-50')}>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetail(a)} className="text-left">
                      <p className="text-white hover:text-amber-400 transition-colors">{a.customer.fullName}</p>
                      <p className="text-xs text-gray-500">{a.customer.phone}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">{formatCurrency(a.creditLimit)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={overLimit ? 'text-red-400' : 'text-gray-300'}>{formatCurrency(a.currentBalance)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={available < 0 ? 'text-red-400' : 'text-green-400'}>{formatCurrency(available)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">Net-{a.terms}</td>
                  <td className="px-4 py-3">
                    {a.isActive
                      ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                      : <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" /> Suspended</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <ActionButton size="sm" variant="primary" onClick={() => setPayTarget(a)}>
                        Payment
                      </ActionButton>
                      <ActionButton size="sm" variant={a.isActive ? 'danger' : 'ghost'}
                        onClick={() => handleToggle(a.id, a.isActive)}>
                        {a.isActive ? 'Suspend' : 'Restore'}
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              )
            })}
            {accounts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No credit accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New account */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Credit Account" size="sm">
        <form action={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer</label>
            <select name="customerId" required className={inputCls}>
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Credit Limit ($)</label>
              <input name="creditLimit" type="number" min="0" step="0.01" required defaultValue="500" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payment Terms (days)</label>
              <input name="terms" type="number" min="1" required defaultValue="30" className={inputCls} />
            </div>
          </div>
          <button type="submit"
            className="w-full py-2.5 rounded-lg font-bold text-gray-950 bg-amber-500 hover:bg-amber-400 transition-colors">
            Create Account
          </button>
        </form>
      </Modal>

      {/* Record payment */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Payment — ${payTarget?.customer.fullName}`} size="sm">
        {payTarget && (
          <form action={handlePayment} className="space-y-4">
            <input type="hidden" name="accountId" value={payTarget.id} />
            <div className="bg-gray-800 rounded-lg px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Outstanding</span>
                <span className="font-mono text-red-400">{formatCurrency(payTarget.currentBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Credit Limit</span>
                <span className="font-mono text-gray-300">{formatCurrency(payTarget.creditLimit)}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payment Amount ($)</label>
              <input name="amount" type="number" min="0.01" step="0.01" required
                defaultValue={payTarget.currentBalance.toFixed(2)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note</label>
              <input name="note" placeholder="e.g. Cheque #1234" className={inputCls} />
            </div>
            <button type="submit"
              className="w-full py-2.5 rounded-lg font-bold text-gray-950 bg-amber-500 hover:bg-amber-400 transition-colors">
              Record Payment
            </button>
          </form>
        )}
      </Modal>

      {/* Transaction history */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`${detail?.customer.fullName} — History`} size="md">
        {detail && (
          <div className="space-y-2">
            {detail.transactions.length === 0
              ? <p className="py-8 text-center text-gray-500">No transactions yet.</p>
              : detail.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <span className={cn('text-xs font-medium',
                      tx.type === 'PAYMENT' ? 'text-green-400' : tx.type === 'CHARGE' ? 'text-red-400' : 'text-gray-400')}>
                      {tx.type}
                    </span>
                    {tx.note && <p className="text-xs text-gray-500 mt-0.5">{tx.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className={cn('font-mono font-semibold',
                      tx.type === 'PAYMENT' ? 'text-green-400' : 'text-red-400')}>
                      {tx.type === 'PAYMENT' ? '−' : '+'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </Modal>
    </div>
  )
}
