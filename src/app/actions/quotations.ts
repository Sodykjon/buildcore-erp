'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function requireStaff() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) throw new Error('Profile not found')
  return { user, profile }
}

async function nextQuoteNumber() {
  const res = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('quote_number_seq')`
  return `QT-${String(Number(res[0].nextval)).padStart(5, '0')}`
}

export async function createQuotationAction(formData: FormData) {
  const { user } = await requireStaff()
  const storeId    = formData.get('storeId')    as string
  const customerId = formData.get('customerId') as string
  const notes      = (formData.get('notes') as string | null) || null
  const expiresAt  = formData.get('expiresAt') as string | null
  let items: { productId: string; quantity: number; unitPrice: number }[]
  try { items = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  if (!storeId || !customerId || !Array.isArray(items) || items.length === 0)
    throw new Error('Missing required fields')
  if (items.some(i => i.quantity <= 0 || i.unitPrice < 0))
    throw new Error('Invalid item quantity or price')

  const quoteNumber = await nextQuoteNumber()

  const quote = await prisma.quotation.create({
    data: {
      quoteNumber,
      storeId,
      customerId,
      staffId:  user.id,
      notes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status:   'DRAFT',
      items: { create: items },
    },
  })

  revalidatePath('/admin/quotations')
  return quote
}

export async function updateQuotationStatusAction(quoteId: string, status: string) {
  await requireStaff()
  await prisma.quotation.update({ where: { id: quoteId }, data: { status: status as never } })
  revalidatePath('/admin/quotations')
}

export async function convertQuotationToOrderAction(quoteId: string) {
  const { user } = await requireStaff()

  const quote = await prisma.quotation.findUnique({
    where:   { id: quoteId },
    include: { items: true },
  })
  if (!quote) throw new Error('Quote not found')
  if (quote.status === 'CONVERTED') throw new Error('Already converted')
  if (quote.items.length === 0) throw new Error('Quote has no items')

  const seqResult  = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('order_number_seq')`
  const orderNumber = `ORD-${new Date().getFullYear()}-${String(Number(seqResult[0].nextval)).padStart(5, '0')}`

  const totalAmount = quote.items.reduce(
    (s, i) => s + Number(i.unitPrice) * i.quantity, 0
  )

  const order = await prisma.$transaction(async tx => {
    // Reserve inventory for each item (same as createOrder)
    for (const item of quote.items) {
      const inv = await tx.storeInventory.findUnique({
        where: { storeId_productId: { storeId: quote.storeId, productId: item.productId } },
      })
      if (!inv) throw new Error(`Product not stocked at this store`)
      const available = inv.quantityOnHand - inv.quantityReserved
      if (available < item.quantity)
        throw new Error(`Insufficient stock: only ${available} units available`)
      await tx.storeInventory.update({
        where: { storeId_productId: { storeId: quote.storeId, productId: item.productId } },
        data:  { quantityReserved: { increment: item.quantity } },
      })
    }

    const o = await tx.order.create({
      data: {
        orderNumber,
        storeId:    quote.storeId,
        customerId: quote.customerId,
        staffId:    user.id,
        status:     'PENDING',
        totalAmount,
        items: {
          create: quote.items.map(i => ({
            productId:        i.productId,
            unitPrice:        i.unitPrice,
            quantityOrdered:  i.quantity,
            quantityPickedUp: 0,
          })),
        },
      },
    })
    await tx.quotation.update({
      where: { id: quoteId },
      data:  { status: 'CONVERTED', convertedOrderId: o.id },
    })
    return o
  })

  revalidatePath('/admin/quotations')
  revalidatePath('/admin/orders')
  return order
}
