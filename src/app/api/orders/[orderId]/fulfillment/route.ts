export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getOrderFulfillmentStatus } from '@/lib/fulfillment'
import { requireApiAuth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const { orderId } = await params

  try {
    const status = await getOrderFulfillmentStatus(orderId)
    return NextResponse.json(status)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Not found' },
      { status: 404 }
    )
  }
}
