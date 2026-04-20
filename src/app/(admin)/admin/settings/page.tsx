import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSystemConfig } from '@/app/actions/settings'
import { SettingsPanel } from '@/components/admin/settings/settings-panel'

export const revalidate = 300

export default async function SettingsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const config = await getSystemConfig()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">System configuration and your profile</p>
      </div>
      <SettingsPanel
        profile={{
          fullName: profile.fullName,
          email:    profile.email,
          role:     profile.role,
          store:    profile.store?.name ?? null,
        }}
        config={config}
        isAdmin={profile.role === 'ADMIN'}
      />
    </div>
  )
}
