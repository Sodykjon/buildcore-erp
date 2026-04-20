'use client'

import { useState, useTransition } from 'react'
import { Store, Plus, Pencil, Trash2, Users, ShoppingCart, Package } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { createStoreAction, updateStoreAction, deleteStoreAction } from '@/app/actions/stores'

type StoreRow = {
  id: string; name: string; address: string; phone: string | null
  staffCount: number; orderCount: number; skuCount: number; totalUnits: number
}

const inputCls = `w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors`
const labelCls = 'block text-xs mb-1'

export function StoreManager({ stores: initial }: { stores: StoreRow[] }) {
  const [stores, setStores]           = useState(initial)
  const [addOpen, setAddOpen]         = useState(false)
  const [editTarget, setEditTarget]   = useState<StoreRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StoreRow | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, startDelete]       = useTransition()

  function reload() { window.location.reload() }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteError(null)
    startDelete(async () => {
      try {
        await deleteStoreAction(deleteTarget.id)
        setStores(s => s.filter(x => x.id !== deleteTarget.id))
        setDeleteTarget(null)
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Failed to delete store')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Stores</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{stores.length} locations</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                     bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Store
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {stores.map(store => (
          <div key={store.id} className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{store.name}</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{store.address}</p>
                  {store.phone && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{store.phone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditTarget(store)}
                  className="text-gray-500 hover:text-amber-400 transition-colors"
                  title="Edit store"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setDeleteTarget(store); setDeleteError(null) }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete store"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Users,       value: store.staffCount, label: 'Staff',  color: 'text-blue-400' },
                { icon: Package,     value: store.skuCount,   label: 'SKUs',   color: '' },
                { icon: Package,     value: store.totalUnits, label: 'Units',  color: 'text-green-400' },
                { icon: ShoppingCart,value: store.orderCount, label: 'Orders', color: 'text-amber-400' },
              ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
                  <p className={`text-xl font-bold ${color}`} style={!color ? { color: 'var(--text-primary)' } : {}}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {stores.length === 0 && (
          <div className="col-span-2 rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            No stores yet.
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Store" size="md">
        <StoreForm onDone={() => { setAddOpen(false); reload() }} setError={setError} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Store" size="md">
        {editTarget && (
          <StoreForm
            store={editTarget}
            onDone={() => { setEditTarget(null); reload() }}
            setError={setError}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Store" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Delete &ldquo;{deleteTarget.name}&rdquo;?</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  This will permanently remove the store and all its inventory records.
                  Orders and staff must be reassigned or removed first.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-center">
              <div className="rounded-lg py-2" style={{ background: 'var(--bg-elevated)' }}>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{deleteTarget.staffCount}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Staff</p>
              </div>
              <div className="rounded-lg py-2" style={{ background: 'var(--bg-elevated)' }}>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{deleteTarget.orderCount}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Orders</p>
              </div>
            </div>

            {deleteTarget.staffCount > 0 || deleteTarget.orderCount > 0 ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                This store cannot be deleted — it has active staff or orders on record.
              </p>
            ) : null}

            {deleteError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg text-sm transition-colors hover:bg-gray-800"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting || deleteTarget.staffCount > 0 || deleteTarget.orderCount > 0}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm
                           font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete Store'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function StoreForm({ store, onDone, setError }: {
  store?: StoreRow; onDone: () => void; setError: (e: string | null) => void
}) {
  const [pending, startTrans] = useTransition()
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTrans(async () => {
      try {
        setErr(null)
        if (store) {
          fd.set('id', store.id)
          await updateStoreAction(fd)
        } else {
          await createStoreAction(fd)
        }
        onDone()
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : 'Error'
        setErr(msg); setError(msg)
      }
    })
  }

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls} style={labelStyle}>Store Name *</label>
        <input name="name" required defaultValue={store?.name} className={inputCls} placeholder="Northside Branch" style={inputStyle} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Address *</label>
        <textarea name="address" required rows={2} defaultValue={store?.address}
          className={`${inputCls} resize-none`} placeholder="123 Main St, City, Country" style={inputStyle} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Phone</label>
        <input name="phone" defaultValue={store?.phone ?? ''} className={inputCls} placeholder="+1 555 000 0000" style={inputStyle} />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Saving…' : store ? 'Save Changes' : 'Create Store'}
      </button>
    </form>
  )
}
