export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const q = request.nextUrl.searchParams.get('q') ?? ''

  if (q.length < 2) return NextResponse.json([])

  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone:    { contains: q } },
      ],
    },
    take:    10,
    orderBy: { fullName: 'asc' },
  })

  return NextResponse.json(customers)
}
