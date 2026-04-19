'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { User, X, UserPlus, Loader2 } from 'lucide-react'

type Customer = { id: string; fullName: string; phone: string; loyaltyPoints: number }

export type { Customer }

const inputCls = `w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`

export function CustomerSearch({ onSelect }: { onSelect: (customer: Customer | null) => void }) {
  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [open,     setOpen]     = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [createErr, setCreateErr] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const { data: results } = useQuery({
    queryKey: ['customer-search', query],
    enabled:  query.length >= 2,
    staleTime: 5_000,
    queryFn:  () =>
      fetch(`/api/customers/search?q=${encodeURIComponent(query)}`).then(r => r.json()),
  })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setCreating(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(c: Customer) {
    setSelected(c); setQuery(''); setOpen(false); setCreating(false)
    onSelect(c)
  }

  function clear() { setSelected(null); setQuery(''); onSelect(null) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateErr(''); setSaving(true)
    try {
      const res = await fetch('/api/customers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: newName, phone: newPhone, email: newEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateErr(data.error || 'Failed'); return }
      select(data)
      setNewName(''); setNewPhone(''); setNewEmail('')
    } catch { setCreateErr('Network error') }
    finally { setSaving(false) }
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
        <User className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{selected.fullName}</p>
          <p className="text-xs text-gray-500">{selected.phone} · {selected.loyaltyPoints} pts</p>
        </div>
        <button onClick={clear} className="text-gray-500 hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search customer by name or phone…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCreating(false) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl
                     text-sm text-gray-200 placeholder:text-gray-500 outline-none
                     focus:border-amber-500 transition-colors"
        />
      </div>

      {open && !creating && (
        <div className="absolute bottom-full mb-1 w-full bg-gray-800 border border-gray-700
                        rounded-xl shadow-xl overflow-hidden z-50">
          {results?.length > 0
            ? results.map((c: Customer) => (
                <button key={c.id} onClick={() => select(c)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0">
                  <p className="text-sm font-medium text-white">{c.fullName}</p>
                  <p className="text-xs text-gray-500">{c.phone} · {c.loyaltyPoints} pts</p>
                </button>
              ))
            : query.length >= 2 && (
                <p className="px-4 py-3 text-xs text-gray-500">No customers found</p>
              )
          }
          <button
            onClick={() => { setCreating(true); setNewPhone(query.match(/^\d/) ? query : '') }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-amber-400
                       hover:bg-gray-700 border-t border-gray-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> New Customer
          </button>
        </div>
      )}

      {creating && (
        <div className="absolute bottom-full mb-1 w-full bg-gray-800 border border-gray-700
                        rounded-xl shadow-xl z-50 p-4">
          <p className="text-sm font-semibold text-white mb-3">New Customer</p>
          <form onSubmit={handleCreate} className="space-y-2">
            <input required value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Full name *" className={inputCls} />
            <input required value={newPhone} onChange={e => setNewPhone(e.target.value)}
              placeholder="Phone *" className={inputCls} />
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="Email (optional)" className={inputCls} />
            {createErr && <p className="text-xs text-red-400">{createErr}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setCreating(false)}
                className="flex-1 py-2 rounded-lg border border-gray-600 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Create & Select'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
