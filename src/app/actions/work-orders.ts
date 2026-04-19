'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { checkAndCreateLowStockAlert } from '@/lib/low-stock'

async function getActor() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) throw new Error('Profile not found')
  return profile
}

async function nextWoNumber() {
  const res = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('wo_number_seq')`
  return `WO-${new Date().getFullYear()}-${String(Number(res[0].nextval)).padStart(5, '0')}`
}

// Warehouse manager creates a draft WO
export async function createWorkOrderAction(formData: FormData) {
  const actor = await getActor()
  if (actor.role === 'STAFF') throw new Error('Unauthorized')
  if (!actor.storeId && actor.role !== 'ADMIN') throw new Error('No store assigned')

  const type    = formData.get('type')   as string
  const reason  = (formData.get('reason') as string).trim()
  const storeId = (formData.get('storeId') as string) || actor.storeId!
  let items: { productId: string; quantity: number; note?: string }[]
  try { items = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  if (!type || !reason || !storeId || !Array.isArray(items) || items.length === 0)
    throw new Error('All fields required')
  if (items.some(i => i.quantity <= 0)) throw new Error('Item quantities must be positive')

  const wo = await prisma.workOrder.create({
    data: {
      woNumber:      await nextWoNumber(),
      type:          type as never,
      status:        'DRAFT',
      storeId,
      requestedById: actor.id,
      reason,
      items: { create: items.map(i => ({ productId: i.productId, quantity: i.quantity, note: i.note || null })) },
    },
    include: { items: { include: { product: true } } },
  })

  revalidatePath('/warehouse/work-orders')
  return wo
}

// Submit DRAFT → SUBMITTED (requests admin approval)
export async function submitWorkOrderAction(id: string) {
  const actor = await getActor()
  if (actor.role === 'STAFF') throw new Error('Unauthorized')

  const wo = await prisma.workOrder.findUnique({ where: { id } })
  if (!wo) throw new Error('Work order not found')
  if (wo.status !== 'DRAFT' && wo.status !== 'REJECTED') throw new Error('Can only submit DRAFT or REJECTED work orders')
  if (wo.requestedById !== actor.id && actor.role !== 'ADMIN') throw new Error('Not your work order')

  await prisma.workOrder.update({
    where: { id },
    data:  { status: 'SUBMITTED', submittedAt: new Date(), adminNote: null },
  })

  revalidatePath('/warehouse/work-orders')
  revalidatePath('/admin/work-orders')
}

// Admin approves — applies inventory changes
export async function approveWorkOrderAction(id: string) {
  const actor = await getActor()
  if (actor.role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({
      where:   { id },
      include: { items: true },
    })
    if (!wo) throw new Error('Work order not found')
    if (wo.status !== 'SUBMITTED') throw new Error('Work order is not pending approval')

    for (const item of wo.items) {
      const inv = await tx.storeInventory.findUnique({
        where: { storeId_productId: { storeId: wo.storeId, productId: item.productId } },
      })
      const before = inv?.quantityOnHand ?? 0
      let after = before

      if (wo.type === 'STOCK_IN') {
        after = before + item.quantity
        await tx.storeInventory.upsert({
          where:  { storeId_productId: { storeId: wo.storeId, productId: item.productId } },
          create: { storeId: wo.storeId, productId: item.productId, quantityOnHand: item.quantity },
          update: { quantityOnHand: { increment: item.quantity } },
        })
      } else if (wo.type === 'STOCK_OUT' || wo.type === 'DAMAGE_WRITE_OFF') {
        after = Math.max(0, before - item.quantity)
        await tx.storeInventory.upsert({
          where:  { storeId_productId: { storeId: wo.storeId, productId: item.productId } },
          create: { storeId: wo.storeId, productId: item.productId, quantityOnHand: 0 },
          update: { quantityOnHand: { decrement: item.quantity } },
        })
      } else if (wo.type === 'ADJUSTMENT') {
        after = item.quantity
        await tx.storeInventory.upsert({
          where:  { storeId_productId: { storeId: wo.storeId, productId: item.productId } },
          create: { storeId: wo.storeId, productId: item.productId, quantityOnHand: item.quantity },
          update: { quantityOnHand: item.quantity },
        })
      }

      await checkAndCreateLowStockAlert(tx, wo.storeId, item.productId)

      // Write audit log
      await tx.inventoryAdjustmentLog.create({
        data: {
          storeId:     wo.storeId,
          productId:   item.productId,
          staffId:     actor.id,
          type:        wo.type,
          quantity:    item.quantity,
          before,
          after,
          reason:      wo.reason,
          workOrderId: wo.id,
        },
      })
    }

    await tx.workOrder.update({
      where: { id },
      data:  { status: 'APPROVED', approvedById: actor.id, resolvedAt: new Date() },
    })
  })

  revalidatePath('/admin/work-orders')
  revalidatePath('/admin/inventory')
  revalidatePath('/admin')
  revalidatePath('/warehouse/work-orders')
  revalidatePath('/warehouse/inventory')
}

// Admin rejects with a reason
export async function rejectWorkOrderAction(formData: FormData) {
  const actor = await getActor()
  if (actor.role !== 'ADMIN') throw new Error('Unauthorized')

  const id        = formData.get('id')        as string
  const adminNote = (formData.get('adminNote') as string).trim()
  if (!adminNote) throw new Error('Rejection reason is required')

  const wo = await prisma.workOrder.findUnique({ where: { id } })
  if (!wo || wo.status !== 'SUBMITTED') throw new Error('Work order is not pending approval')

  await prisma.workOrder.update({
    where: { id },
    data:  { status: 'REJECTED', adminNote, approvedById: actor.id, resolvedAt: new Date() },
  })

  revalidatePath('/admin/work-orders')
  revalidatePath('/warehouse/work-orders')
}

// Warehouse manager updates items and resubmits a REJECTED WO
export async function resubmitWorkOrderAction(formData: FormData) {
  const actor = await getActor()
  if (actor.role === 'STAFF') throw new Error('Unauthorized')

  const id     = formData.get('id')     as string
  const reason = (formData.get('reason') as string).trim()
  let items: { productId: string; quantity: number; note?: string }[]
  try { items = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  if (!reason || !Array.isArray(items) || items.length === 0) throw new Error('Reason and items required')
  if (items.some(i => i.quantity <= 0)) throw new Error('Item quantities must be positive')

  const wo = await prisma.workOrder.findUnique({ where: { id } })
  if (!wo) throw new Error('Work order not found')
  if (wo.status !== 'REJECTED') throw new Error('Can only resubmit REJECTED work orders')
  if (wo.requestedById !== actor.id && actor.role !== 'ADMIN') throw new Error('Not your work order')

  await prisma.$transaction([
    prisma.workOrderItem.deleteMany({ where: { workOrderId: id } }),
    prisma.workOrder.update({
      where: { id },
      data: {
        reason,
        status:      'SUBMITTED',
        submittedAt: new Date(),
        adminNote:   null,
        items: { create: items.map(i => ({ productId: i.productId, quantity: i.quantity, note: i.note || null })) },
      },
    }),
  ])

  revalidatePath('/warehouse/work-orders')
  revalidatePath('/admin/work-orders')
}
