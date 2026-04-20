'use client'

import { useState, useTransition } from 'react'
import { User, Lock, Sliders, CheckCircle, Puzzle } from 'lucide-react'
import { saveSystemConfigAction, saveFeatureFlagsAction, updateProfileAction, changePasswordAction } from '@/app/actions/settings'

type Profile = { fullName: string; email: string; role: string; store: string | null }

const INPUT_STYLE = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as const
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors'

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

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

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
    <SectionCard icon={<User className="w-4 h-4" />} title="Your Profile">
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        {[['Email', profile.email], ['Role', profile.role], ['Store', profile.store ?? 'All stores']].map(([label, val]) => (
          <div key={label}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p style={{ color: label === 'Role' ? 'var(--accent)' : 'var(--text-secondary)' }}>{val}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Display Name</label>
          <input name="fullName" required defaultValue={profile.fullName} className={inputCls} style={INPUT_STYLE} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> : pending ? 'Saving…' : 'Save Name'}
        </button>
      </form>
    </SectionCard>
  )
}

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
    <SectionCard icon={<Lock className="w-4 h-4" />} title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>New Password</label>
          <input name="password" type="password" required minLength={8} className={inputCls} style={INPUT_STYLE} placeholder="Min. 8 characters" />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Confirm Password</label>
          <input name="confirmPass" type="password" required className={inputCls} style={INPUT_STYLE} placeholder="Repeat password" />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          {success ? <><CheckCircle className="w-4 h-4 text-green-400" /> Password changed!</> : pending ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </SectionCard>
  )
}

const OPTIONAL_MODULES = [
  { key: 'feature_delivery', label: 'Delivery Dispatch',          desc: 'Assign fulfilled orders to drivers and track delivery status.' },
  { key: 'feature_credit',   label: 'Customer Credit Accounts',   desc: 'Net-30 terms, credit limits, and outstanding balance visible at POS.' },
  { key: 'feature_quotes',   label: 'Quotations / Estimates',     desc: 'Create price quotes for customers and convert them to orders.' },
  { key: 'feature_ap',       label: 'Supplier Invoice Matching',  desc: 'Match received PO items to supplier invoices; track accounts payable.' },
] as const

function OptionalModulesSection({ config }: { config: Record<string, string> }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(OPTIONAL_MODULES.map(m => [m.key, config[m.key] === 'true']))
  )
  const [pending, startTrans] = useTransition()
  const [success, setSuccess] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  function toggle(key: string) { setFlags(f => ({ ...f, [key]: !f[key] })) }

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
    <SectionCard icon={<Puzzle className="w-4 h-4" />} title="Optional Modules">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enable additional modules. Changes take effect after the next page load.</p>
      <div className="space-y-3">
        {OPTIONAL_MODULES.map(m => (
          <label key={m.key} className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 relative shrink-0">
              <input type="checkbox" className="sr-only" checked={flags[m.key] ?? false} onChange={() => toggle(m.key)} />
              <div className={`w-10 h-5 rounded-full transition-colors ${flags[m.key] ? 'bg-amber-500' : ''}`}
                   style={!flags[m.key] ? { background: 'var(--bg-muted)' } : {}} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${flags[m.key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <div>
              <p className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
            </div>
          </label>
        ))}
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button onClick={handleSave} disabled={pending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
        {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> : pending ? 'Saving…' : 'Save Modules'}
      </button>
    </SectionCard>
  )
}

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
    <SectionCard icon={<Sliders className="w-4 h-4" />} title="System Configuration">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Loyalty Points per 1 UZS Spent</label>
            <input name="loyaltyRate" type="number" min="0" step="0.1"
              defaultValue={config.loyaltyRate ?? '1'} className={inputCls} style={INPUT_STYLE} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Currently: {config.loyaltyRate ?? '1'} pt per 1 UZS</p>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Default Low Stock Threshold</label>
            <input name="defaultThreshold" type="number" min="0"
              defaultValue={config.defaultThreshold ?? '10'} className={inputCls} style={INPUT_STYLE} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Applied to new inventory records</p>
          </div>
        </div>
        <div className="rounded-lg px-4 py-3 space-y-1 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <p><span style={{ color: 'var(--text-secondary)' }}>Point Value:</span> 1 UZS per point (fixed)</p>
          <p><span style={{ color: 'var(--text-secondary)' }}>Database:</span> Supabase PostgreSQL</p>
          <p><span style={{ color: 'var(--text-secondary)' }}>Version:</span> BuildCore ERP 1.0</p>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> : pending ? 'Saving…' : 'Save Configuration'}
        </button>
      </form>
    </SectionCard>
  )
}
