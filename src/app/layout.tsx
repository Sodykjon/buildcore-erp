import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/providers/app-providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BuildCore ERP',
  description: 'Multi-store construction materials management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} antialiased h-full`} style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
