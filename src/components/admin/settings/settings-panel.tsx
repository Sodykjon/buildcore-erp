'use client'

import { useState, useTransition } from 'react'
import { User, Lock, Sliders, CheckCircle, Puzzle } from 'lucide-react'
import { saveSystemConfigAction, saveFeatureFlagsAction, updateProfileAction, changePasswordAction } from '@/app/actions/settings'

const inputCls = `w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm
  text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-500 transition-colors`
const labelCls = 'block text-xs text-gray-500 mb-1.5'

type Profile = { fullName: string; email: string; role: string; store: string | null }

export function SettingsPanel({ profile, config, isAdmin }: {
  profile: Profile; config: Record<string, string>; isAdmin: boolean
}) {
  return (
    <div className="space-y-6">
      <ProfileSection profile={profile} />
      <PasswordSection />
      {isAdmin && <SystemSection config={config} />}
      {isAdmin && <OptionalModulesSection config={config} />}
    </div>
  )
}

// ── Profile ───────────────────────────────────────────────────────────────────

function ProfileSection({ profile }: { profile: Profile }) {
  const [pending, startTrans] = useTransition()
  const [success, setSuccess] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTrans(async () => {
      try {
        setErr(null)
        await updateProfileAction(fd)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : 'Error') }
    })
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-amber-400" />
        <h2 className="font-semibold text-white">Your Profile</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500 text-xs mb-1">Email</p>
          <p className="text-gray-300">{profile.email}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Role</p>
          <p className="text-amber-400 font-semibold">{profile.role}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Store</p>
          <p className="text-gray-300">{profile.store ?? 'All stores'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>Display Name</label>
          <input name="fullName" required defaultValue={profile.fullName} className={inputCls} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400
                     text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
          {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> : pending ? 'Saving…' : 'Save Name'}
        </button>
      </form>
    </section>
  )
}

// ── Password ──────────────────────────────────────────────────────────────────

function PasswordSection() {
  const [pending, startTrans] = useTransition()
  const [success, setSuccess] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd  = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTrans(async () => {
      try {
        setErr(null)
        await changePasswordAction(fd)
        setSuccess(true)
        form.reset()
        setTimeout(() => setSuccess(false), 3000)
      } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : 'Error') }
    })
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-amber-400" />
        <h2 className="font-semibold text-white">Change Password</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>New Password</label>
          <input name="password" type="password" required minLength={8} className={inputCls}
            placeholder="Min. 8 characters" />
        </div>
        <div>
          <label className={labelCls}>Confirm Password</label>
          <input name="confirmPass" type="password" required className={inputCls}
            placeholder="Repeat password" />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600
                     text-white font-bold text-sm transition-all disabled:opacity-50">
          {success ? <><CheckCircle className="w-4 h-4 text-green-400" /> Password changed!</> : pending ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </section>
  )
}

// ── Optional modules (admin only) ─────────────────────────────────────────────

const OPTIONAL_MODULES = [
  {
    key:   'feature_delivery',
    label: 'Delivery Dispatch',
    desc:  'Assign fulfilled orders to drivers and track delivery status (OUT_FOR_DELIVERY → DELIVERED).',
  },
  {
    key:   'feature_credit',
    label: 'Customer Credit Accounts',
    desc:  'Net-30 terms, credit limits, and outstanding balance visible at POS.',
  },
  {
    key:   'feature_quotes',
    label: 'Quotations / Estimates',
    desc:  'Create price quotes for customers and convert them to orders.',
  },
  {
    key:   'feature_ap',
    label: 'Supplier Invoice Matching',
    desc:  'Match received PO items to supplier invoices; track accounts payable.',
  },
] as const

function OptionalModulesSection({ config }: { config: Record<string, string> }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(OPTIONAL_MODULES.map(m => [m.key, config[m.key] === 'true']))
  )
  const [pending, startTrans] = useTransition()
  const [success, setSuccess] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  function toggle(key: string) {
    setFlags(f => ({ ...f, [key]: !f[key] }))
  }

  function handleSave() {
    startTrans(async () => {
      try {
        setErr(null)
        const fd = new FormData()
        for (const [k, v] of Object.entries(flags)) fd.set(k, String(v))
        await saveFeatureFlagsAction(fd)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : 'Error') }
    })
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Puzzle className="w-4 h-4 text-amber-400" />
        <h2 className="font-semibold text-white">Optional Modules</h2>
      </div>
      <p className="text-xs text-gray-500">
        Enable additional modules for this installation. Changes take effect after the next page load.
      </p>
      <div className="space-y-3">
        {OPTIONAL_MODULES.map(m => (
          <label key={m.key} className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 relative shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={flags[m.key] ?? false}
                onChange={() => toggle(m.key)}
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${flags[m.key] ? 'bg-amber-500' : 'bg-gray-700'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                               ${flags[m.key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
            </div>
          </label>
        ))}
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button onClick={handleSave} disabled={pending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400
                   text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
        {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> : pending ? 'Saving…' : 'Save Modules'}
      </button>
    </section>
  )
}

// ── System config (admin only) ────────────────────────────────────────────────

function SystemSection({ config }: { config: Record<string, string> }) {
  const [pending, startTrans] = useTransition()
  const [success, setSuccess] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTrans(async () => {
      try {
        setErr(null)
        await saveSystemConfigAction(fd)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : 'Error') }
    })
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sliders className="w-4 h-4 text-amber-400" />
        <h2 className="font-semibold text-white">System Configuration</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Loyalty Points per $1 Spent</label>
            <input name="loyaltyRate" type="number" min="0" step="0.1"
              defaultValue={config.loyaltyRate ?? '1'}
              className={inputCls} />
            <p className="text-xs text-gray-600 mt-1">Currently: {config.loyaltyRate ?? '1'} pt per $1</p>
          </div>
          <div>
            <label className={labelCls}>Default Low Stock Threshold</label>
            <input name="defaultThreshold" type="number" min="0"
              defaultValue={config.defaultThreshold ?? '10'}
              className={inputCls} />
            <p className="text-xs text-gray-600 mt-1">Applied to new inventory records</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg px-4 py-3 space-y-1 text-xs text-gray-500">
          <p><span className="text-gray-400">Point Value:</span> $0.01 per point (fixed)</p>
          <p><span className="text-gray-400">Database:</span> Supabase PostgreSQL</p>
          <p><span className="text-gray-400">Version:</span> BuildCore ERP 1.0</p>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400
                     text-gray-950 font-bold text-sm transition-all disabled:opacity-50">
          {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> : pending ? 'Saving…' : 'Save Configuration'}
        </button>
      </form>
    </section>
  )
}
