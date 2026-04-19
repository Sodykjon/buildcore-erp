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

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`
const labelCls = 'block text-xs text-gray-500 mb-1'

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
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{profiles.length} accounts</p>
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

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {profiles.map(p => {
              const RoleIcon = roleIcon[p.role as keyof typeof roleIcon] ?? User
              return (
                <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.fullName}</td>
                  <td className="px-4 py-3 text-gray-400">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${roleColor[p.role as keyof typeof roleColor] ?? 'text-gray-400'}`}>
                      <RoleIcon className="w-3.5 h-3.5" />
                      {p.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.store?.name ?? <span className="text-gray-600">All stores</span>}</td>
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
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Full Name *</label>
        <input name="fullName" required className={inputCls} placeholder="Jane Smith" />
      </div>
      <div>
        <label className={labelCls}>Email *</label>
        <input name="email" type="email" required className={inputCls} placeholder="jane@company.com" />
      </div>
      <div>
        <label className={labelCls}>Password *</label>
        <input name="password" type="password" required minLength={8} className={inputCls} placeholder="Min 8 characters" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Role *</label>
          <select name="role" required value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
            <option value="STAFF">Staff</option>
            <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Store {role === 'ADMIN' ? '(optional)' : '*'}</label>
          <select name="storeId" required={role !== 'ADMIN'} className={inputCls}>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Full Name *</label>
        <input name="fullName" required defaultValue={profile.fullName} className={inputCls} />
      </div>
      <p className="text-xs text-gray-500">Email: {profile.email} (cannot change)</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Role *</label>
          <select name="role" required value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
            <option value="STAFF">Staff</option>
            <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Store</label>
          <select name="storeId" className={inputCls} defaultValue={profile.storeId ?? ''}>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-400">Reset password for <strong className="text-white">{profile.fullName}</strong></p>
      <div>
        <label className={labelCls}>New Password *</label>
        <input name="password" type="password" required minLength={8} className={inputCls} placeholder="Min 8 characters" />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {pending ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  )
}
