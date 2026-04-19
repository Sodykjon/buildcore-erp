import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/auth'

export default async function RootPage() {
  const profile = await getServerProfile()

  if (!profile)                     redirect('/login')
  if (profile.role === 'ADMIN')     redirect('/admin')
  if (profile.role === 'STAFF')     redirect('/pos')
  redirect('/warehouse/fulfillment')
}
