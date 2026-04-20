import { prisma } from '@/lib/prisma'
import { UserManager } from '@/components/admin/users/user-manager'

export const revalidate = 300

export default async function UsersPage() {
  const [profiles, stores] = await Promise.all([
    prisma.profile.findMany({
      include: { store: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.store.findMany({ orderBy: { name: 'asc' } }),
  ])

  return <UserManager profiles={profiles} stores={stores} />
}
