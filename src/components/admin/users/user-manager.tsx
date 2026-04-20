'use client'

import { useState, useTransition } from 'react'
import { Users, Plus, Pencil, KeyRound, Trash2, Shield, ShieldCheck, User } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { createUserAction, updateUserAction, resetUserPasswordAction, deleteUserAction } from '@/app/actions/users'

type Store   = { id: string; name: string }
type Profile = { id: string; email: string; fullName: string; role: string; storeId: string | null; store: Store | null }

const roleIcon  = { ADMIN: Shield, WAREHOUSE_MANAGER: ShieldCheck, STAFF: User }
const roleColor = {
  ADMIN:             'text-amber-400',
  WAREHOUSE_MANAGER: 'text-blue-400',
  STAFF:             'text-gray-400',
}

const inputCls = `w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors`
const labelCls = 'block text-xs mb-1'

export function UserManager({ profiles: initial, stores }: { profiles: Profile[]; stores: Store[] }) {
  const [profiles, setProfiles] = useState(initial)
  const [addOpen, setAddOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Profile | null>(null)
  const [pwTarget, setPwTarget]     = useState<Profile | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [, startTrans]              = useTransition()

  function reload() { window.location.reload() }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    startTrans(async () => {
      try {
        await deleteUserAction(id)
        setProfiles(ps => ps.filter(p => p.id !== id))
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Users</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{profiles.length} accounts</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                     bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
              const RoleIcon = roleIcon[p.role as keyof typeof roleIcon] ?? User
              return (
                <tr key={p.id} className="hover:bg-gray-800/40 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{p.fullName}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${roleColor[p.role as keyof typeof roleColor] ?? 'text-gray-400'}`}>
                      <RoleIcon className="w-3.5 h-3.5" />
                      {p.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.store?.name ?? <span style={{ color: 'var(--text-muted)' }}>All stores</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditTarget(p)}
                        className="text-gray-500 hover:text-blue-400 transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setPwTarget(p)}
                        className="text-gray-500 hover:text-amber-400 transition-colors" title="Reset password">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.fullName)}
                        className="text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add User" size="md">
        <UserForm stores={stores} onDone={() => { setAddOpen(false); reload() }} setError={setError} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit User" size="md">
        {editTarget && (
          <EditUserForm profile={editTarget} stores={stores}
            onDone={() => { setEditTarget(null); reload() }} setError={setError} />
        )}
      </Modal>

      <Modal open={!!pwTarget} onClose={() => setPwTarget(null)} title="Reset Password" size="sm">
        {pwTarget && (
          <ResetPasswordForm profile={pwTarget}
            onDone={() => setPwTarget(null)} setError={setError} />
        )}
      </Modal>
    </div>
  )
}

// ── Create user form ──────────────────────────────────────────────────────────

function UserForm({ stores, onDone, setError }: {
  stores: Store[]; onDone: () => void; setError: (e: string | null) => void
}) {
  const [pending, startTrans] = useTransition()
  const [role, setRole]       = useState('STAFF')
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTrans(async () => {
      try {
        setErr(null)
        await createUserAction(fd)
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
        <label className={labelCls} style={labelStyle}>Full Name *</label>
        <input name="fullName" required className={inputCls} placeholder="Jane Smith" style={inputStyle} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Email *</label>
        <input name="email" type="email" required className={inputCls} placeholder="jane@company.com" style={inputStyle} />
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Password *</label>
        <input name="password" type="password" required minLength={8} className={inputCls} placeholder="Min 8 characters" style={inputStyle} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Role *</label>
          <select name="role" required value={role} onChange={e => setRole(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="STAFF">Staff</option>
            <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Store {role === 'ADMIN' ? '(optional)' : '*'}</label>
          <select name="storeId" required={role !== 'ADMIN'} className={inputCls} style={inputStyle}>
            <option value="">All stores (Admin)</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Creating…' : 'Create User'}
      </button>
    </form>
  )
}

function EditUserForm({ profile, stores, onDone, setError }: {
  profile: Profile; stores: Store[]; onDone: () => void; setError: (e: string | null) => void
}) {
  const [pending, startTrans] = useTransition()
  const [role, setRole]       = useState(profile.role)
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('id', profile.id)
    startTrans(async () => {
      try {
        setErr(null)
        await updateUserAction(fd)
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
        <label className={labelCls} style={labelStyle}>Full Name *</label>
        <input name="fullName" required defaultValue={profile.fullName} className={inputCls} style={inputStyle} />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Email: {profile.email} (cannot change)</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Role *</label>
          <select name="role" required value={role} onChange={e => setRole(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="STAFF">Staff</option>
            <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Store</label>
          <select name="storeId" className={inputCls} defaultValue={profile.storeId ?? ''} style={inputStyle}>
            <option value="">All stores (Admin)</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}

function ResetPasswordForm({ profile, onDone, setError }: {
  profile: Profile; onDone: () => void; setError: (e: string | null) => void
}) {
  const [pending, startTrans] = useTransition()
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('id', profile.id)
    startTrans(async () => {
      try {
        setErr(null)
        await resetUserPasswordAction(fd)
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
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Reset password for <strong style={{ color: 'var(--text-primary)' }}>{profile.fullName}</strong></p>
      <div>
        <label className={labelCls} style={labelStyle}>New Password *</label>
        <input name="password" type="password" required minLength={8} className={inputCls} placeholder="Min 8 characters" style={inputStyle} />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  )
}
