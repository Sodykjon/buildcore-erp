import { prisma } from './prisma'
import { TransferStatus } from '@prisma/client'

export async function requestTransfer(input: {
  sourceStoreId: string
  destStoreId:   string
  requestedById: string
  items: { productId: string; quantityRequested: number }[]
}) {
  const seqResult     = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('transfer_number_seq')`
  const transferNumber = `TRF-${new Date().getFullYear()}-${String(Number(seqResult[0].nextval)).padStart(5, '0')}`

  return prisma.storeTransfer.create({
    data: {
      transferNumber,
      sourceStoreId: input.sourceStoreId,
      destStoreId:   input.destStoreId,
      requestedById: input.requestedById,
      status:        TransferStatus.REQUESTED,
      items: { create: input.items.map(i => ({ productId: i.productId, quantityRequested: i.quantityRequested })) },
    },
    include: { items: true },
  })
}

export async function approveTransfer(transferId: string, approvedById: string) {
  return prisma.storeTransfer.update({
    where: { id: transferId },
    data:  { status: TransferStatus.APPROVED, approvedById },
  })
}

export async function shipTransfer(input: {
  transferId:  string
  shippedById: string
  items: { transferItemId: string; quantityShipped: number }[]
}) {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.storeTransfer.findUnique({
      where:   { id: input.transferId },
      include: { items: { include: { product: true } } },
    })

    if (!transfer)                             throw new Error('Transfer not found')
    if (transfer.status !== 'APPROVED')        throw new Error('Transfer must be APPROVED before shipping')

    for (const shipped of input.items) {
      const tItem = transfer.items.find(i => i.id === shipped.transferItemId)
      if (!tItem) throw new Error(`Transfer item ${shipped.transferItemId} not found`)

      const inv = await tx.storeInventory.findUnique({
        where: { storeId_productId: { storeId: transfer.sourceStoreId, productId: tItem.productId } },
      })

      const available = (inv?.quantityOnHand ?? 0) - (inv?.quantityReserved ?? 0)
      if (available < shipped.quantityShipped) {
        throw new Error(`Insufficient stock at source store for ${tItem.product.name}`)
      }

      await tx.storeInventory.update({
        where: { storeId_productId: { storeId: transfer.sourceStoreId, productId: tItem.productId } },
        data:  { quantityOnHand: { decrement: shipped.quantityShipped } },
      })

      await tx.transferItem.update({
        where: { id: shipped.transferItemId },
        data:  { quantityShipped: shipped.quantityShipped },
      })
    }

    return tx.storeTransfer.update({
      where: { id: input.transferId },
      data:  { status: TransferStatus.SHIPPED, shippedById: input.shippedById, shippedAt: new Date() },
    })
  })
}

export async function receiveTransfer(input: {
  transferId:   string
  receivedById: string
  items: { transferItemId: string; quantityReceived: number }[]
}) {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.storeTransfer.findUnique({
      where:   { id: input.transferId },
      include: { items: true },
    })

    if (!transfer)                        throw new Error('Transfer not found')
    if (transfer.status !== 'SHIPPED')    throw new Error('Transfer must be SHIPPED before receiving')

    for (const received of input.items) {
      const tItem = transfer.items.find(i => i.id === received.transferItemId)
      if (!tItem) throw new Error(`Transfer item ${received.transferItemId} not found`)

      await tx.storeInventory.upsert({
        where:  { storeId_productId: { storeId: transfer.destStoreId, productId: tItem.productId } },
        update: { quantityOnHand: { increment: received.quantityReceived } },
        create: { storeId: transfer.destStoreId, productId: tItem.productId, quantityOnHand: received.quantityReceived, quantityReserved: 0 },
      })

      await tx.transferItem.update({
        where: { id: received.transferItemId },
        data:  { quantityReceived: received.quantityReceived },
      })
    }

    return tx.storeTransfer.update({
      where: { id: input.transferId },
      data:  { status: TransferStatus.RECEIVED, receivedById: input.receivedById, receivedAt: new Date() },
    })
  })
}
