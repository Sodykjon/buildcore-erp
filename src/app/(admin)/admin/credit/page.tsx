import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CreditManager } from '@/components/admin/credit/credit-manager'

export const revalidate = 0

export default async function CreditPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'ADMIN') redirect('/admin')

  const accounts = await prisma.creditAccount.findMany({
    include: {
      customer:     { select: { id: true, fullName: true, phone: true } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
    orderBy: { createdAt: 'desc' },
  })

  const customers = await prisma.customer.findMany({
    where:   { creditAccount: null },
    orderBy: { fullName: 'asc' },
    select:  { id: true, fullName: true, phone: true },
  })

  const serialized = accounts.map((a: typeof accounts[number]) => ({
    ...a,
    creditLimit:    Number(a.creditLimit),
    currentBalance: Number(a.currentBalance),
    createdAt:      a.createdAt.toISOString(),
    updatedAt:      a.updatedAt.toISOString(),
    transactions:   a.transactions.map(t => ({
      ...t,
      amount:    Number(t.amount),
      createdAt: t.createdAt.toISOString(),
    })),
  }))

  return <CreditManager accounts={serialized} customers={customers} />
}
