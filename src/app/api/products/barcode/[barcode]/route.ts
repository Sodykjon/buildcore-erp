export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const { barcode } = await params
  const storeId     = request.nextUrl.searchParams.get('storeId')

  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const product = await prisma.product.findUnique({
    where: { barcode },
    include: {
      inventory: {
        where: { storeId },
      },
    },
  })

  if (!product || !product.isActive) {
    return NextResponse.json(null, { status: 404 })
  }

  const inv = product.inventory[0]

  return NextResponse.json({
    productId: product.id,
    name:      product.name,
    unit:      product.unit,
    unitPrice: Number(product.sellPrice),
    barcode:   product.barcode,
    onHand:    inv?.quantityOnHand    ?? 0,
    reserved:  inv?.quantityReserved  ?? 0,
  })
}
