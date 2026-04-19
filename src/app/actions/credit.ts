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
  return { user, profile }
}

export async function createCreditAccountAction(formData: FormData) {
  await requireAdmin()
  const customerId   = formData.get('customerId')   as string
  const creditLimit  = parseFloat(formData.get('creditLimit') as string || '0')
  const terms        = parseInt(formData.get('terms') as string || '30', 10)

  await prisma.creditAccount.create({
    data: { customerId, creditLimit, terms },
  })
  revalidatePath('/admin/credit')
}

export async function updateCreditLimitAction(accountId: string, creditLimit: number, terms: number) {
  await requireAdmin()
  await prisma.creditAccount.update({
    where: { id: accountId },
    data:  { creditLimit, terms },
  })
  revalidatePath('/admin/credit')
}

export async function recordCreditPaymentAction(formData: FormData) {
  await requireAdmin()
  const accountId = formData.get('accountId') as string
  const amount    = parseFloat(formData.get('amount') as string || '0')
  const note      = (formData.get('note') as string | null) || null

  if (amount <= 0) throw new Error('Amount must be positive')

  await prisma.$transaction(async tx => {
    await tx.creditTx.create({
      data: { creditAccountId: accountId, type: 'PAYMENT', amount, note },
    })
    await tx.creditAccount.update({
      where: { id: accountId },
      data:  { currentBalance: { decrement: amount } },
    })
  })
  revalidatePath('/admin/credit')
}

export async function toggleCreditAccountAction(accountId: string, isActive: boolean) {
  await requireAdmin()
  await prisma.creditAccount.update({ where: { id: accountId }, data: { isActive } })
  revalidatePath('/admin/credit')
}
