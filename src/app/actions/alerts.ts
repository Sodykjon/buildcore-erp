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

export async function markAlertReadAction(id: string) {
  await requireAdmin()
  await prisma.lowStockAlert.update({ where: { id }, data: { isRead: true } })
  revalidatePath('/admin/alerts')
}

export async function markAllAlertsReadAction() {
  await requireAdmin()
  await prisma.lowStockAlert.updateMany({ where: { isRead: false }, data: { isRead: true } })
  revalidatePath('/admin/alerts')
}
