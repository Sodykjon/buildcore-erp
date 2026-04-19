import { prisma } from './prisma'

export type GlobalStockRow = {
  productId:      string
  productName:    string
  barcode:        string
  unit:           string
  totalOnHand:    number
  totalReserved:  number
  totalAvailable: number
  perStore: {
    storeId:   string
    storeName: string
    onHand:    number
    reserved:  number
    available: number
  }[]
}

export async function getGlobalStock(productId?: string): Promise<GlobalStockRow[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(productId ? { id: productId } : {}),
    },
    include: {
      inventory: {
        include: { store: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return products.map(p => {
    const perStore = p.inventory.map(inv => ({
      storeId:   inv.store.id,
      storeName: inv.store.name,
      onHand:    inv.quantityOnHand,
      reserved:  inv.quantityReserved,
      available: inv.quantityOnHand - inv.quantityReserved,
    }))
    return {
      productId:      p.id,
      productName:    p.name,
      barcode:        p.barcode,
      unit:           p.unit,
      totalOnHand:    perStore.reduce((s, x) => s + x.onHand, 0),
      totalReserved:  perStore.reduce((s, x) => s + x.reserved, 0),
      totalAvailable: perStore.reduce((s, x) => s + x.available, 0),
      perStore,
    }
  })
}

export async function getStoreStock(storeId: string, productId: string) {
  const inv = await prisma.storeInventory.findUnique({
    where:   { storeId_productId: { storeId, productId } },
    include: { product: true },
  })
  if (!inv) return null
  return { ...inv, quantityAvailable: inv.quantityOnHand - inv.quantityReserved }
}
