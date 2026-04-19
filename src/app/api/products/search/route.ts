import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  const q       = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const storeId = req.nextUrl.searchParams.get('storeId') ?? ''

  if (q.length < 2) return NextResponse.json([])

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku:  { contains: q, mode: 'insensitive' } },
      ],
    },
    include: {
      inventory: { where: { storeId }, select: { quantityOnHand: true, quantityReserved: true } },
    },
    take: 12,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(products.map(p => ({
    productId: p.id,
    name:      p.name,
    sku:       p.sku,
    unit:      p.unit,
    unitPrice: Number(p.sellPrice),
    barcode:   p.barcode,
    onHand:    p.inventory[0]?.quantityOnHand ?? 0,
    reserved:  p.inventory[0]?.quantityReserved ?? 0,
  })))
}
