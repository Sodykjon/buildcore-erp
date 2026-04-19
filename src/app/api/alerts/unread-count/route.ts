import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function GET() {
  const deny = await requireApiAuth()
  if (deny) return deny
  const count = await prisma.lowStockAlert.count({ where: { isRead: false } })
  return NextResponse.json({ count })
}
