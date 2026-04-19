import { Prisma } from '@prisma/client'

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Call inside a transaction after any stock change.
 * Creates a LowStockAlert if on-hand <= threshold and no unread alert exists yet.
 */
export async function checkAndCreateLowStockAlert(
  tx: TxClient,
  storeId: string,
  productId: string,
) {
  const inv = await tx.storeInventory.findUnique({
    where: { storeId_productId: { storeId, productId } },
  })
  if (!inv) return
  if (inv.quantityOnHand > inv.lowStockThreshold) return

  const existing = await tx.lowStockAlert.findFirst({
    where: { storeId, productId, isRead: false },
  })
  if (existing) return

  await tx.lowStockAlert.create({
    data: { storeId, productId, quantity: inv.quantityOnHand },
  })
}
