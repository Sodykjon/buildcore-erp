import { prisma } from '@/lib/prisma'
import { ProductManager } from '@/components/admin/products/product-manager'

export const revalidate = 60

export default async function InventoryPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        inventory: { include: { store: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  const serialized = products.map(p => ({
    ...p,
    costPrice: Number(p.costPrice),
    sellPrice: Number(p.sellPrice),
    inventory: p.inventory.map(i => ({
      storeId:        i.storeId,
      quantityOnHand: i.quantityOnHand,
      store:          { name: i.store.name },
    })),
  }))

  return <ProductManager products={serialized} categories={categories} />
}
