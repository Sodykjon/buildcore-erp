import { prisma } from '@/lib/prisma'
import { StoreManager } from '@/components/admin/stores/store-manager'

export const revalidate = 0

export default async function StoresPage() {
  const stores = await prisma.store.findMany({
    include: {
      _count:    { select: { profiles: true, ordersAsOrigin: true } },
      inventory: true,
    },
    orderBy: { name: 'asc' },
  })

  const rows = stores.map(s => ({
    id:         s.id,
    name:       s.name,
    address:    s.address,
    phone:      s.phone ?? null,
    staffCount: s._count.profiles,
    orderCount: s._count.ordersAsOrigin,
    skuCount:   s.inventory.filter(i => i.quantityOnHand > 0).length,
    totalUnits: s.inventory.reduce((sum, i) => sum + i.quantityOnHand, 0),
  }))

  return <StoreManager stores={rows} />
}
