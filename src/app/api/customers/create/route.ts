import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  try {
    const { fullName, phone, email } = await req.json()
    if (!fullName?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const existing = await prisma.customer.findUnique({ where: { phone: phone.trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 })
    }

    const customer = await prisma.customer.create({
      data: { fullName: fullName.trim(), phone: phone.trim(), email: email?.trim() || null },
    })

    return NextResponse.json({
      id:            customer.id,
      fullName:      customer.fullName,
      phone:         customer.phone,
      loyaltyPoints: customer.loyaltyPoints,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
