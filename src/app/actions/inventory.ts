'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { checkAndCreateLowStockAlert } from '@/lib/low-stock'

async function requireAdminOrManager() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role === 'STAFF') throw new Error('Unauthorized')
  return profile
}

// Direct adjustment (admin/manager quick adjust with reason logged)
export async function adjustInventoryAction(formData: FormData) {
  const actor = await requireAdminOrManager()

  const storeId   = formData.get('storeId')   as string
  const productId = formData.get('productId') as string
  const type      = formData.get('type')      as 'add' | 'set' | 'remove'
  const quantity  = parseInt(formData.get('quantity') as string, 10)
  const reason    = (formData.get('reason') as string | null)?.trim() || 'Manual adjustment'

  if (!storeId || !productId || !type || isNaN(quantity) || quantity < 0 || quantity > 999999) {
    throw new Error('Invalid adjustment data')
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.storeInventory.findUnique({
      where: { storeId_productId: { storeId, productId } },
    })
    const before = existing?.quantityOnHand ?? 0
    let after = before

    if (type === 'set') {
      after = Math.max(0, quantity)
      await tx.storeInventory.upsert({
        where:  { storeId_productId: { storeId, productId } },
        create: { storeId, productId, quantityOnHand: after },
        update: { quantityOnHand: after },
      })
    } else if (type === 'add') {
      after = before + quantity
      await tx.storeInventory.upsert({
        where:  { storeId_productId: { storeId, productId } },
        create: { storeId, productId, quantityOnHand: quantity },
        update: { quantityOnHand: { increment: quantity } },
      })
    } else if (type === 'remove') {
      if (!existing) throw new Error('No inventory record found')
      after = Math.max(0, before - quantity)
      await tx.storeInventory.update({
        where: { storeId_productId: { storeId, productId } },
        data:  { quantityOnHand: after },
      })
    }

    await tx.inventoryAdjustmentLog.create({
      data: { storeId, productId, staffId: actor.id, type, quantity, before, after, reason },
    })
    await checkAndCreateLowStockAlert(tx, storeId, productId)
  })

  revalidatePath('/admin/inventory')
  revalidatePath('/admin/stock')
  revalidatePath('/admin')
  revalidatePath('/warehouse/inventory')
}

export async function updateLowStockThresholdAction(formData: FormData) {
  await requireAdminOrManager()

  const storeId   = formData.get('storeId')   as string
  const productId = formData.get('productId') as string
  const threshold = parseInt(formData.get('threshold') as string, 10)

  if (isNaN(threshold) || threshold < 0) throw new Error('Invalid threshold')

  await prisma.storeInventory.upsert({
    where:  { storeId_productId: { storeId, productId } },
    create: { storeId, productId, lowStockThreshold: threshold },
    update: { lowStockThreshold: threshold },
  })

  revalidatePath('/admin/inventory')
  revalidatePath('/warehouse/inventory')
}
