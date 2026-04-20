'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { User, X, UserPlus, Loader2 } from 'lucide-react'

type Customer = { id: string; fullName: string; phone: string; loyaltyPoints: number }
export type { Customer }

const INP = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as const

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
    queryFn:  () => fetch(`/api/customers/search?q=${encodeURIComponent(query)}`).then(r => r.json()),
  })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(c: Customer) { setSelected(c); setQuery(''); setOpen(false); setCreating(false); onSelect(c) }
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
      <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
        <User className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.fullName}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.phone} · {selected.loyaltyPoints} pts</p>
        </div>
        <button onClick={clear} className="transition-colors hover:text-red-400" style={{ color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search customer by name or phone…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCreating(false) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={INP}
        />
      </div>

      {open && !creating && (
        <div className="absolute bottom-full mb-1 w-full rounded-xl shadow-xl overflow-hidden z-50"
             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {results?.length > 0
            ? results.map((c: Customer) => (
                <button key={c.id} onClick={() => select(c)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.fullName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.phone} · {c.loyaltyPoints} pts</p>
                </button>
              ))
            : query.length >= 2 && <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No customers found</p>
          }
          <button
            onClick={() => { setCreating(true); setNewPhone(query.match(/^\d/) ? query : '') }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            style={{ borderTop: '1px solid var(--border)' }}>
            <UserPlus className="w-4 h-4" /> New Customer
          </button>
        </div>
      )}

      {creating && (
        <div className="absolute bottom-full mb-1 w-full rounded-xl shadow-xl z-50 p-4"
             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>New Customer</p>
          <form onSubmit={handleCreate} className="space-y-2">
            {[
              { value: newName, onChange: setNewName, placeholder: 'Full name *', required: true },
              { value: newPhone, onChange: setNewPhone, placeholder: 'Phone *', required: true },
              { value: newEmail, onChange: setNewEmail, placeholder: 'Email (optional)', required: false },
            ].map(({ value, onChange, placeholder, required }) => (
              <input key={placeholder} required={required} value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={INP} />
            ))}
            {createErr && <p className="text-xs text-red-400">{createErr}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setCreating(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Create & Select'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
