'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { checkAndCreateLowStockAlert } from '@/lib/low-stock'

async function getAdminOrManager() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role === 'STAFF') throw new Error('Unauthorized')
  return profile
}

async function nextPoNumber() {
  const res = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('po_number_seq')`
  return `PO-${new Date().getFullYear()}-${String(Number(res[0].nextval)).padStart(5, '0')}`
}

export async function createSupplierAction(formData: FormData) {
  await getAdminOrManager()
  const name    = (formData.get('name')    as string).trim()
  const contact = (formData.get('contact') as string | null)?.trim() || null
  const phone   = (formData.get('phone')   as string | null)?.trim() || null
  const email   = (formData.get('email')   as string | null)?.trim() || null
  const address = (formData.get('address') as string | null)?.trim() || null
  if (!name) throw new Error('Supplier name is required')
  await prisma.supplier.create({ data: { name, contact, phone, email, address } })
  revalidatePath('/admin/purchase-orders')
}

export async function updateSupplierAction(formData: FormData) {
  await getAdminOrManager()
  const id      = formData.get('id') as string
  const name    = (formData.get('name')    as string).trim()
  const contact = (formData.get('contact') as string | null)?.trim() || null
  const phone   = (formData.get('phone')   as string | null)?.trim() || null
  const email   = (formData.get('email')   as string | null)?.trim() || null
  const address = (formData.get('address') as string | null)?.trim() || null
  if (!name) throw new Error('Supplier name is required')
  await prisma.supplier.update({ where: { id }, data: { name, contact, phone, email, address } })
  revalidatePath('/admin/purchase-orders')
}

export async function createPurchaseOrderAction(formData: FormData) {
  const actor = await getAdminOrManager()
  const supplierId = formData.get('supplierId') as string
  const storeId    = formData.get('storeId')    as string
  const notes      = (formData.get('notes') as string | null)?.trim() || null

  let items: { productId: string; quantityOrdered: number; unitCost: number }[]
  try { items = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  if (!supplierId || !storeId || !Array.isArray(items) || items.length === 0)
    throw new Error('All fields required')
  if (items.some(i => i.quantityOrdered <= 0 || i.unitCost < 0))
    throw new Error('Invalid item quantity or cost')

  await prisma.purchaseOrder.create({
    data: {
      poNumber:   await nextPoNumber(),
      supplierId,
      storeId,
      createdById: actor.id,
      notes,
      status:     'DRAFT',
      items: {
        create: items.map(i => ({
          productId:       i.productId,
          quantityOrdered: i.quantityOrdered,
          unitCost:        new Prisma.Decimal(i.unitCost),
        })),
      },
    },
  })
  revalidatePath('/admin/purchase-orders')
}

export async function submitPurchaseOrderAction(id: string) {
  await getAdminOrManager()
  await prisma.purchaseOrder.update({
    where: { id },
    data:  { status: 'ORDERED', orderedAt: new Date() },
  })
  revalidatePath('/admin/purchase-orders')
}

export async function receivePurchaseOrderAction(formData: FormData) {
  const actor = await getAdminOrManager()
  const id = formData.get('id') as string
  let items: { purchaseOrderItemId: string; productId: string; quantityReceived: number }[]
  try { items = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  // ── reads outside the transaction to avoid timeout ───────────────────────
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } })
  if (!po) throw new Error('Purchase order not found')
  if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
    throw new Error('Cannot receive a ' + po.status.toLowerCase() + ' order')
  }

  // Pre-load current inventory quantities for all items being received
  const productIds = items.map(i => i.productId)
  const existingInv = await prisma.storeInventory.findMany({
    where: { storeId: po.storeId, productId: { in: productIds } },
    select: { productId: true, quantityOnHand: true },
  })
  const invMap = Object.fromEntries(existingInv.map(i => [i.productId, i.quantityOnHand]))

  // Compute what we'll actually receive per item
  type ReceiveLine = {
    purchaseOrderItemId: string
    productId: string
    toReceive: number
    before: number
    after: number
  }
  const lines: ReceiveLine[] = []
  for (const recv of items) {
    if (recv.quantityReceived <= 0) continue
    const poItem = po.items.find(i => i.id === recv.purchaseOrderItemId)
    if (!poItem) continue
    const remaining = poItem.quantityOrdered - poItem.quantityReceived
    const toReceive = Math.min(recv.quantityReceived, remaining)
    if (toReceive <= 0) continue
    const before = invMap[recv.productId] ?? 0
    lines.push({ purchaseOrderItemId: recv.purchaseOrderItemId, productId: recv.productId, toReceive, before, after: before + toReceive })
  }

  // ── writes only inside the transaction ───────────────────────────────────
  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      await tx.purchaseOrderItem.update({
        where: { id: line.purchaseOrderItemId },
        data:  { quantityReceived: { increment: line.toReceive } },
      })
      await tx.storeInventory.upsert({
        where:  { storeId_productId: { storeId: po.storeId, productId: line.productId } },
        create: { storeId: po.storeId, productId: line.productId, quantityOnHand: line.toReceive },
        update: { quantityOnHand: { increment: line.toReceive } },
      })
      await tx.inventoryAdjustmentLog.create({
        data: {
          storeId:   po.storeId,
          productId: line.productId,
          staffId:   actor.id,
          type:      'STOCK_IN',
          quantity:  line.toReceive,
          before:    line.before,
          after:     line.after,
          reason:    `Purchase Order ${po.poNumber}`,
        },
      })
    }

    // Recompute PO status using pre-received + what we just added
    const updatedItems = po.items.map(i => {
      const line = lines.find(l => l.purchaseOrderItemId === i.id)
      return { ...i, quantityReceived: i.quantityReceived + (line?.toReceive ?? 0) }
    })
    const allReceived  = updatedItems.every(i => i.quantityReceived >= i.quantityOrdered)
    const someReceived = updatedItems.some(i => i.quantityReceived > 0)
    const newStatus = allReceived ? 'RECEIVED' : someReceived ? 'PARTIALLY_RECEIVED' : po.status

    await tx.purchaseOrder.update({
      where: { id },
      data:  { status: newStatus as never, receivedAt: allReceived ? new Date() : undefined },
    })
  })

  // Low-stock alerts are non-critical — run after the transaction
  for (const line of lines) {
    await checkAndCreateLowStockAlert(prisma, po.storeId, line.productId).catch(() => {})
  }

  revalidatePath('/admin/purchase-orders')
  revalidatePath('/admin/stock')
  revalidatePath('/admin/inventory')
  revalidatePath('/warehouse/inventory')
}

export async function cancelPurchaseOrderAction(id: string) {
  await getAdminOrManager()
  const po = await prisma.purchaseOrder.findUnique({ where: { id } })
  if (!po) throw new Error('Not found')
  if (po.status === 'RECEIVED') throw new Error('Cannot cancel a received order')
  await prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } })
  revalidatePath('/admin/purchase-orders')
}
