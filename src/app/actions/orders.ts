'use server'

import { createOrder } from '@/lib/orders'
import { createActionSupabase } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { checkAndCreateLowStockAlert } from '@/lib/low-stock'

export async function createOrderAction(formData: FormData) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const storeId        = formData.get('storeId')        as string
  const customerId     = (formData.get('customerId') as string | null) || null
  const notes          = (formData.get('notes') as string | null)?.trim() || undefined
  const pointsToRedeem = parseInt(formData.get('pointsToRedeem') as string || '0', 10)

  let items, payments
  try {
    items    = JSON.parse(formData.get('items')    as string)
    payments = JSON.parse(formData.get('payments') as string)
  } catch {
    throw new Error('Invalid request data')
  }

  if (!Array.isArray(items) || items.length === 0) throw new Error('Cart is empty')
  if (!Array.isArray(payments) || payments.length === 0) throw new Error('Payment data missing')

  const order = await createOrder({
    storeId,
    customerId,
    staffId: user.id,
    notes,
    items,
    payments,
    pointsToRedeem: isNaN(pointsToRedeem) ? 0 : pointsToRedeem,
  })

  revalidatePath('/admin')
  revalidatePath('/admin/orders')
  return { orderId: order.id, orderNumber: order.orderNumber, status: order.status }
}

export async function cancelOrderAction(orderId: string) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role === 'STAFF') throw new Error('Unauthorized')

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) throw new Error('Order not found')
    if (order.status === 'FULFILLED' || order.status === 'CANCELLED') {
      throw new Error(`Cannot cancel a ${order.status.toLowerCase()} order`)
    }

    for (const item of order.items) {
      const remaining = item.quantityOrdered - item.quantityPickedUp
      if (remaining > 0) {
        await tx.storeInventory.updateMany({
          where: { storeId: order.storeId, productId: item.productId },
          data:  { quantityReserved: { decrement: remaining } },
        })
      }
    }

    await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
  })

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  revalidatePath('/warehouse/fulfillment')
}

export async function refundOrderAction(orderId: string, reason: string) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role === 'STAFF') throw new Error('Unauthorized — admin or manager only')

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where:   { id: orderId },
      include: { items: true },
    })
    if (!order) throw new Error('Order not found')
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new Error(`Order is already ${order.status.toLowerCase()}`)
    }

    // Return picked-up inventory back to stock, release reserved qty
    for (const item of order.items) {
      const pickedUp = item.quantityPickedUp
      const reserved = item.quantityOrdered - pickedUp

      const inv = await tx.storeInventory.findFirst({
        where: { storeId: order.storeId, productId: item.productId },
      })
      const before = inv?.quantityOnHand ?? 0

      await tx.storeInventory.updateMany({
        where: { storeId: order.storeId, productId: item.productId },
        data:  {
          quantityOnHand:   { increment: pickedUp },
          quantityReserved: { decrement: reserved > 0 ? reserved : 0 },
        },
      })

      await tx.inventoryAdjustmentLog.create({
        data: {
          storeId:   order.storeId,
          productId: item.productId,
          staffId:   user.id,
          type:      'RETURN',
          quantity:  pickedUp,
          before,
          after:     before + pickedUp,
          reason:    `Refund of order ${order.orderNumber}: ${reason}`,
        },
      })

      await checkAndCreateLowStockAlert(tx, order.storeId, item.productId)
    }

    // Reverse any loyalty points earned on this order
    const loyaltyTxs = await tx.loyaltyTransaction.findMany({
      where: { orderId, type: 'EARN' },
    })
    const pointsToReverse = loyaltyTxs.reduce((s, t) => s + t.points, 0)
    if (pointsToReverse > 0 && order.customerId) {
      await tx.loyaltyTransaction.create({
        data: {
          customerId: order.customerId,
          type:       'ADJUSTMENT',
          points:     -pointsToReverse,
          orderId,
          note:       `Reversed loyalty for refund of ${order.orderNumber}`,
        },
      })
      await tx.customer.update({
        where: { id: order.customerId },
        data:  { loyaltyPoints: { decrement: pointsToReverse } },
      })
    }

    // Restore any loyalty points that were redeemed
    const redeemedTxs = await tx.loyaltyTransaction.findMany({
      where: { orderId, type: 'REDEEM' },
    })
    const pointsToRestore = redeemedTxs.reduce((s, t) => s + Math.abs(t.points), 0)
    if (pointsToRestore > 0 && order.customerId) {
      await tx.loyaltyTransaction.create({
        data: {
          customerId: order.customerId,
          type:       'ADJUSTMENT',
          points:     pointsToRestore,
          orderId,
          note:       `Restored redeemed points for refund of ${order.orderNumber}`,
        },
      })
      await tx.customer.update({
        where: { id: order.customerId },
        data:  { loyaltyPoints: { increment: pointsToRestore } },
      })
    }

    await tx.order.update({
      where: { id: orderId },
      data:  { status: 'REFUNDED' },
    })
  })

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}
