import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/auth'
import { WarehouseSidebar } from '@/components/warehouse/sidebar'

export default async function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'STAFF') redirect('/pos')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <WarehouseSidebar
        storeName={profile.store?.name ?? 'All Stores'}
        userName={profile.fullName}
      />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 pt-16 lg:pt-6">
        {children}
      </main>
    </div>
  )
}
