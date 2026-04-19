import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/auth'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (!profile.storeId) redirect('/login')

  return <>{children}</>
}
