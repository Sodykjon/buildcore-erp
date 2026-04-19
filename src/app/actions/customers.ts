'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  return user
}

export async function createCustomerAction(formData: FormData) {
  await requireAuth()

  const fullName = (formData.get('fullName') as string).trim()
  const phone    = (formData.get('phone')    as string).trim()
  const email    = (formData.get('email')    as string | null)?.trim() || null

  if (!fullName || !phone) throw new Error('Name and phone are required')

  const customer = await prisma.customer.create({ data: { fullName, phone, email } })
  revalidatePath('/admin/customers')
  return customer
}

export async function updateCustomerAction(formData: FormData) {
  await requireAuth()

  const id       = formData.get('id')       as string
  const fullName = (formData.get('fullName') as string).trim()
  const phone    = (formData.get('phone')    as string).trim()
  const email    = (formData.get('email')    as string | null)?.trim() || null

  if (!fullName || !phone) throw new Error('Name and phone are required')

  const customer = await prisma.customer.update({ where: { id }, data: { fullName, phone, email } })
  revalidatePath('/admin/customers')
  return customer
}

export async function deactivateCustomerAction(id: string, active: boolean) {
  await requireAuth()
  await prisma.customer.update({ where: { id }, data: { isActive: active } })
  revalidatePath('/admin/customers')
}

export async function adjustLoyaltyAction(formData: FormData) {
  await requireAuth()

  const customerId = formData.get('customerId') as string
  const points     = parseInt(formData.get('points') as string, 10)
  const note       = (formData.get('note') as string | null)?.trim() || null

  if (!customerId || isNaN(points)) throw new Error('Invalid data')

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: { customerId, type: 'ADJUSTMENT', points, note },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data:  { loyaltyPoints: { increment: points } },
    }),
  ])

  revalidatePath('/admin/customers')
}
