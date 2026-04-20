'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { LangProvider } from '@/i18n/context'
import { ThemeProvider } from '@/i18n/theme'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:          60 * 1000,
        gcTime:             5 * 60 * 1000,
        retry:              2,
        refetchOnReconnect: true,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </LangProvider>
    </QueryClientProvider>
  )
}
