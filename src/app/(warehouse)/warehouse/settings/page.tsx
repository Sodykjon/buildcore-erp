import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SettingsPanel } from '@/components/admin/settings/settings-panel'

export const revalidate = 30

export default async function WarehouseSettingsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'STAFF') redirect('/pos')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Update your profile and password</p>
      </div>
      <SettingsPanel
        profile={{
          fullName: profile.fullName,
          email:    profile.email,
          role:     profile.role,
          store:    profile.store?.name ?? null,
        }}
        config={{}}
        isAdmin={false}
      />
    </div>
  )
}
