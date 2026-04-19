import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BuildCore ERP',
  description: 'Multi-store construction materials management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased h-full`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
