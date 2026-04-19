import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { requireApiAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const statusParam = request.nextUrl.searchParams.get('status')
  const storeId     = request.nextUrl.searchParams.get('storeId')

  const statuses = statusParam
    ? (statusParam.split(',') as OrderStatus[])
    : undefined

  const orders = await prisma.order.findMany({
    where: {
      ...(statuses && { status: { in: statuses } }),
      ...(storeId  && { storeId }),
    },
    include:  { customer: true, store: true },
    orderBy:  { createdAt: 'desc' },
    take:     50,
  })

  return NextResponse.json(orders)
}
