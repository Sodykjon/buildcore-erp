'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => Promise<void> | void
  variant?: 'primary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md'
}

const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }

const variantStyles: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--accent)', color: 'var(--accent-fg)' },
  danger:  { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  ghost:   { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  success: { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
}

export function ActionButton({
  onClick, variant = 'primary', size = 'md', children, className, disabled, ...rest
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      {...rest}
      disabled={pending || disabled}
      onClick={() => startTransition(() => Promise.resolve(onClick()))}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
        sizes[size],
        className,
      )}
      style={variantStyles[variant]}
    >
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
}
