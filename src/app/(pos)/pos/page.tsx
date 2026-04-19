import { PosTerminal } from '@/components/pos/pos-terminal'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PosPage() {
  const profile = await getServerProfile()
  if (!profile || !profile.storeId) redirect('/login')

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      <PosTerminal
        storeId={profile.storeId}
        staffId={profile.id}
        storeName={profile.store?.name}
        userName={profile.fullName}
      />
    </div>
  )
}
