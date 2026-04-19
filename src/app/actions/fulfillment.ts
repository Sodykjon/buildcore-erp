'use server'

import { processFulfillment } from '@/lib/fulfillment'
import { awardPoints } from '@/lib/loyalty'
import { createActionSupabase } from "@/lib/supabase-server"
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function fulfillOrderAction(formData: FormData) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const orderId = formData.get('orderId') as string
  let pickups
  try { pickups = JSON.parse(formData.get('pickups') as string) }
  catch { throw new Error('Invalid pickups data') }
  const notes   = formData.get('notes') as string | undefined

  const result = await processFulfillment({ orderId, staffId: user.id, pickups, notes })

  if (result.orderStatus === 'FULFILLED') {
    const order = await prisma.order.findUnique({
      where:  { id: orderId },
      select: { customerId: true, totalAmount: true },
    })
    if (order) {
      await awardPoints(order.customerId ?? null, orderId, Number(order.totalAmount))
    }
  }

  revalidatePath('/warehouse/fulfillment')
  revalidatePath('/admin')
  return result
}
