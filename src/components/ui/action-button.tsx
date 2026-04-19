'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => Promise<void> | void
  variant?: 'primary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md'
}

const variants = {
  primary: 'bg-amber-500 hover:bg-amber-400 text-gray-950',
  danger:  'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
  ghost:   'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700',
  success: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
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
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
}
