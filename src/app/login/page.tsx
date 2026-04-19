'use client'

import { useState, useTransition } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
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
        setError(error.message)
        return
      }

      router.push('/')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">BuildCore</h1>
          <p className="text-gray-400 text-sm mt-2">Construction Materials ERP</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder:text-gray-500 outline-none
                         focus:border-amber-500 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder:text-gray-500 outline-none
                         focus:border-amber-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20
                          rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400
                       text-gray-950 font-bold transition-all
                       disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
