'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function requireStaff() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) throw new Error('Unauthorized')
  return profile
}

async function requireAdmin() {
  const profile = await requireStaff()
  if (profile.role !== 'ADMIN') throw new Error('Admin access required')
  return profile
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function createCategoryAction(formData: FormData) {
  await requireStaff()
  const name = (formData.get('name') as string).trim()
  if (!name) throw new Error('Category name required')
  const category = await prisma.category.create({ data: { name } })
  revalidatePath('/admin/inventory')
  return category
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin()
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) throw new Error(`Cannot delete — ${count} product(s) use this category`)
  await prisma.category.delete({ where: { id } })
  revalidatePath('/admin/inventory')
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function createProductAction(formData: FormData) {
  await requireStaff()

  const sku       = (formData.get('sku')       as string).trim().toUpperCase()
  const barcode   = (formData.get('barcode')   as string).trim()
  const name      = (formData.get('name')      as string).trim()
  const unit      = (formData.get('unit')      as string).trim()
  const costPrice = parseFloat(formData.get('costPrice') as string)
  const sellPrice = parseFloat(formData.get('sellPrice') as string)
  const categoryId = formData.get('categoryId') as string
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!sku || !barcode || !name || !unit || isNaN(costPrice) || isNaN(sellPrice) || !categoryId) {
    throw new Error('All required fields must be filled')
  }
  if (costPrice < 0 || sellPrice < 0) throw new Error('Prices cannot be negative')

  const product = await prisma.product.create({
    data: { sku, barcode, name, unit, costPrice, sellPrice, categoryId, description },
  })

  // Create zero-stock inventory rows for every store
  const stores = await prisma.store.findMany({ select: { id: true } })
  if (stores.length > 0) {
    await prisma.storeInventory.createMany({
      data: stores.map(s => ({ storeId: s.id, productId: product.id })),
      skipDuplicates: true,
    })
  }

  revalidatePath('/admin/inventory')
  revalidatePath('/admin')
  return product
}

export async function updateProductAction(formData: FormData) {
  await requireStaff()

  const id        = formData.get('id') as string
  const name      = (formData.get('name')      as string).trim()
  const unit      = (formData.get('unit')      as string).trim()
  const barcode   = (formData.get('barcode')   as string).trim()
  const costPrice = parseFloat(formData.get('costPrice') as string)
  const sellPrice = parseFloat(formData.get('sellPrice') as string)
  const categoryId = formData.get('categoryId') as string
  const description = (formData.get('description') as string | null)?.trim() || null

  const product = await prisma.product.update({
    where: { id },
    data: { name, unit, barcode, costPrice, sellPrice, categoryId, description },
  })

  revalidatePath('/admin/inventory')
  return product
}

export async function archiveProductAction(id: string, archive: boolean) {
  await requireAdmin()
  await prisma.product.update({ where: { id }, data: { isActive: !archive } })
  revalidatePath('/admin/inventory')
}
