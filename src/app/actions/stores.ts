'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== 'ADMIN') throw new Error('Unauthorized')
  return profile
}

export async function createStoreAction(formData: FormData) {
  await requireAdmin()

  const name    = (formData.get('name')    as string).trim()
  const address = (formData.get('address') as string).trim()
  const phone   = (formData.get('phone')   as string | null)?.trim() || null

  if (!name || !address) throw new Error('Name and address are required')

  const store = await prisma.$transaction(async (tx) => {
    const newStore = await tx.store.create({ data: { name, address, phone } })
    // Bootstrap inventory rows for all existing products
    const products = await tx.product.findMany({ where: { isActive: true }, select: { id: true } })
    if (products.length > 0) {
      await tx.storeInventory.createMany({
        data: products.map(p => ({ storeId: newStore.id, productId: p.id })),
        skipDuplicates: true,
      })
    }
    return newStore
  })

  revalidatePath('/admin/stores')
  revalidatePath('/admin')
  return store
}

export async function deleteStoreAction(id: string) {
  await requireAdmin()

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      _count: { select: { profiles: true, ordersAsOrigin: true } },
    },
  })
  if (!store) throw new Error('Store not found')
  if (store._count.profiles > 0)
    throw new Error(`Cannot delete — ${store._count.profiles} staff member(s) are assigned to this store`)
  if (store._count.ordersAsOrigin > 0)
    throw new Error(`Cannot delete — this store has ${store._count.ordersAsOrigin} order(s) on record`)

  await prisma.storeInventory.deleteMany({ where: { storeId: id } })
  await prisma.store.delete({ where: { id } })

  revalidatePath('/admin/stores')
  revalidatePath('/admin')
}

export async function updateStoreAction(formData: FormData) {
  await requireAdmin()

  const id      = formData.get('id')      as string
  const name    = (formData.get('name')    as string).trim()
  const address = (formData.get('address') as string).trim()
  const phone   = (formData.get('phone')   as string | null)?.trim() || null

  if (!name || !address) throw new Error('Name and address are required')

  const store = await prisma.store.update({ where: { id }, data: { name, address, phone } })
  revalidatePath('/admin/stores')
  return store
}
