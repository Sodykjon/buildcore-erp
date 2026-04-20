'use client'

import { useState, useTransition } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useLang } from '@/i18n/context'
import { useTheme } from '@/i18n/theme'
import { type Locale } from '@/i18n/translations'
import { Sun, Moon } from 'lucide-react'

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
]

export default function LoginPage() {
  const { t, locale, setLocale } = useLang()
  const { theme, toggleTheme } = useTheme()
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTrans]   = useTransition()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTrans(async () => {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(t.login.error)
        return
      }

      router.push('/')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      {/* Language + theme controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        {LOCALES.map(l => (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className="text-xs px-2 py-1 rounded font-medium transition-colors"
            style={locale === l.code
              ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
              : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            {l.label}
          </button>
        ))}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded transition-colors"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>BuildCore</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Construction Materials ERP</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.login.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 outline-none transition-colors"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t.login.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 outline-none transition-colors"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg px-3 py-2 text-red-400 bg-red-500/10 border border-red-500/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.login.signingIn}</> : t.login.signIn}
          </button>
        </form>
      </div>
    </div>
  )
}
