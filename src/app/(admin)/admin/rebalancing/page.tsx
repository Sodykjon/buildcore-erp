import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RebalancingPanel } from '@/components/admin/rebalancing/rebalancing-panel'

export const revalidate = 0

export default async function RebalancingPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'ADMIN') redirect('/admin')

  // Load all inventory with thresholds across all stores
  const inventory = await prisma.storeInventory.findMany({
    where:   { product: { isActive: true } },
    include: {
      store:   { select: { id: true, name: true } },
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
  })

  // Build suggestion: store A overstocked (onHand > 2 * threshold && threshold > 0)
  //                   store B understocked (onHand <= threshold)
  // For same product
  type InvRow = typeof inventory[number]
  const byProduct = new Map<string, InvRow[]>()
  for (const row of inventory) {
    const list = byProduct.get(row.productId) ?? []
    list.push(row)
    byProduct.set(row.productId, list)
  }

  const suggestions: {
    productId:   string
    productName: string
    sku:         string
    unit:        string
    fromStoreId: string
    fromStore:   string
    fromOnHand:  number
    toStoreId:   string
    toStore:     string
    toOnHand:    number
    toThreshold: number
    suggestedQty:number
  }[] = []

  for (const [, rows] of byProduct) {
    const overstocked   = rows.filter(r => r.lowStockThreshold > 0 && r.quantityOnHand > 2 * r.lowStockThreshold)
    const understocked  = rows.filter(r => r.lowStockThreshold > 0 && r.quantityOnHand <= r.lowStockThreshold)
    for (const from of overstocked) {
      for (const to of understocked) {
        if (from.storeId === to.storeId) continue
        const needed       = to.lowStockThreshold * 2 - to.quantityOnHand   // bring to 2× threshold
        const available    = from.quantityOnHand - from.lowStockThreshold    // keep source above threshold
        const suggestedQty = Math.min(needed, available)
        if (suggestedQty <= 0) continue
        suggestions.push({
          productId:    from.productId,
          productName:  from.product.name,
          sku:          from.product.sku,
          unit:         from.product.unit,
          fromStoreId:  from.storeId,
          fromStore:    from.store.name,
          fromOnHand:   from.quantityOnHand,
          toStoreId:    to.storeId,
          toStore:      to.store.name,
          toOnHand:     to.quantityOnHand,
          toThreshold:  to.lowStockThreshold,
          suggestedQty,
        })
      }
    }
  }

  suggestions.sort((a, b) =>
    (b.toThreshold - b.toOnHand) - (a.toThreshold - a.toOnHand)
  )

  const stores   = await prisma.store.findMany({ orderBy: { name: 'asc' } })
  const products = await prisma.product.findMany({
    where: { isActive: true }, orderBy: { name: 'asc' },
    select: { id: true, name: true, unit: true, sku: true, costPrice: true, sellPrice: true },
  })

  return (
    <RebalancingPanel
      suggestions={suggestions}
      stores={stores}
      products={products.map(p => ({ ...p, costPrice: Number(p.costPrice), sellPrice: Number(p.sellPrice) }))}
    />
  )
}
