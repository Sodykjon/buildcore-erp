'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function requireManager() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role === 'STAFF') throw new Error('Unauthorized')
  return { user, profile }
}

export async function createDeliveryAction(formData: FormData) {
  await requireManager()
  const orderId    = formData.get('orderId')     as string
  const driverName = formData.get('driverName')  as string
  const driverPhone = (formData.get('driverPhone') as string | null) || null
  const scheduledAt = formData.get('scheduledAt') as string | null

  if (!orderId || !driverName) throw new Error('Order and driver name required')

  const delivery = await prisma.delivery.create({
    data: {
      orderId,
      driverName,
      driverPhone,
      status: 'PENDING',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  })

  revalidatePath('/admin/delivery')
  return delivery
}

export async function updateDeliveryStatusAction(deliveryId: string, status: string, notes?: string) {
  await requireManager()

  const data: Record<string, unknown> = { status }
  if (notes) data.notes = notes
  if (status === 'DELIVERED') data.deliveredAt = new Date()

  await prisma.delivery.update({ where: { id: deliveryId }, data })
  revalidatePath('/admin/delivery')
}
