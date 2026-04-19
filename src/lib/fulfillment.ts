import { prisma } from './prisma'
import { OrderStatus } from '@prisma/client'

type FulfillmentInput = {
  orderId:  string
  staffId:  string
  pickups: { orderItemId: string; quantityTaken: number }[]
  notes?:  string
}

export type FulfillmentResult = {
  success:        boolean
  orderStatus:    OrderStatus
  remainingItems: {
    orderItemId:       string
    productName:       string
    quantityOrdered:   number
    quantityPickedUp:  number
    quantityRemaining: number
  }[]
}

export async function processFulfillment(input: FulfillmentInput): Promise<FulfillmentResult> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where:   { id: input.orderId },
      include: { items: { include: { product: true } } },
    })

    if (!order)                               throw new Error('Order not found')
    if (order.status === 'FULFILLED')         throw new Error('Order already fully fulfilled')
    if (order.status === 'CANCELLED')         throw new Error('Cannot fulfill a cancelled order')

    for (const pickup of input.pickups) {
      const lineItem = order.items.find(i => i.id === pickup.orderItemId)
      if (!lineItem) throw new Error(`Order item ${pickup.orderItemId} not found`)

      const remaining = lineItem.quantityOrdered - lineItem.quantityPickedUp
      if (pickup.quantityTaken > remaining) {
        throw new Error(
          `Cannot pick up ${pickup.quantityTaken} — only ${remaining} remaining for ${lineItem.product.name}`
        )
      }

      await tx.fulfillmentLog.create({
        data: {
          orderItemId:   lineItem.id,
          quantityTaken: pickup.quantityTaken,
          staffId:       input.staffId,
          notes:         input.notes,
        },
      })

      await tx.orderItem.update({
        where: { id: lineItem.id },
        data:  { quantityPickedUp: { increment: pickup.quantityTaken } },
      })

      // Only here do we reduce physical stock
      await tx.storeInventory.update({
        where: {
          storeId_productId: { storeId: order.storeId, productId: lineItem.productId },
        },
        data: {
          quantityOnHand:   { decrement: pickup.quantityTaken },
          quantityReserved: { decrement: pickup.quantityTaken },
        },
      })
    }

    const updatedItems = await tx.orderItem.findMany({
      where:   { orderId: order.id },
      include: { product: true },
    })

    const allFulfilled = updatedItems.every(i => i.quantityPickedUp >= i.quantityOrdered)
    const anyPickedUp  = updatedItems.some(i => i.quantityPickedUp > 0)

    const newStatus = allFulfilled
      ? OrderStatus.FULFILLED
      : anyPickedUp
        ? OrderStatus.PARTIAL
        : OrderStatus.PAID

    await tx.order.update({ where: { id: order.id }, data: { status: newStatus } })

    return {
      success:        true,
      orderStatus:    newStatus,
      remainingItems: updatedItems.map(i => ({
        orderItemId:       i.id,
        productName:       i.product.name,
        quantityOrdered:   i.quantityOrdered,
        quantityPickedUp:  i.quantityPickedUp,
        quantityRemaining: i.quantityOrdered - i.quantityPickedUp,
      })),
    }
  })
}

export async function getOrderFulfillmentStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: {
      customer: true,
      items: {
        include: {
          product:         true,
          fulfillmentLogs: { orderBy: { pickedUpAt: 'asc' } },
        },
      },
    },
  })

  if (!order) throw new Error('Order not found')

  return {
    orderNumber: order.orderNumber,
    status:      order.status,
    customer:    order.customer?.fullName ?? 'Guest',
    items: order.items.map(item => ({
      product:           item.product.name,
      unit:              item.product.unit,
      quantityOrdered:   item.quantityOrdered,
      quantityPickedUp:  item.quantityPickedUp,
      quantityRemaining: item.quantityOrdered - item.quantityPickedUp,
      pickupHistory: item.fulfillmentLogs.map(log => ({
        quantity: log.quantityTaken,
        pickedAt: log.pickedUpAt,
        notes:    log.notes,
      })),
    })),
  }
}
