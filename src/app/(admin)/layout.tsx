import { AdminSidebar } from '@/components/admin/sidebar'
import { LowStockBanner } from '@/components/admin/low-stock-banner'
import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <LowStockBanner />
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pt-16 lg:pt-6 page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}
