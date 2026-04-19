import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { StockManager } from '@/components/admin/inventory/stock-manager'

export const revalidate = 0

export default async function WarehouseInventoryPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  // Warehouse managers see only their store; admins see all
  const storeFilter = profile.storeId
    ? { storeId: profile.storeId }
    : {}

  const products = await prisma.product.findMany({
    where:   { isActive: true },
    include: {
      category: true,
      inventory: {
        where:   storeFilter,
        include: { store: true },
        orderBy: { store: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = products.map(p => ({
    id:       p.id,
    name:     p.name,
    sku:      p.sku,
    unit:     p.unit,
    category: p.category.name,
    stores:   p.inventory.map(i => ({
      storeId:   i.storeId,
      storeName: i.store.name,
      onHand:    i.quantityOnHand,
      reserved:  i.quantityReserved,
      threshold: i.lowStockThreshold,
    })),
  }))

  return <StockManager products={rows} />
}
