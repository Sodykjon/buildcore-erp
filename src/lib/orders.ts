import { prisma } from './prisma'
import { OrderStatus, Prisma } from '@prisma/client'

export type PaymentSplit = {
  method: string  // CASH | CARD | MOBILE | CREDIT
  amount: number
}

type CreateOrderInput = {
  storeId:         string
  customerId?:     string | null
  staffId:         string
  notes?:          string
  pointsToRedeem?: number
  payments:        PaymentSplit[]
  items: {
    productId:       string
    quantityOrdered: number
    unitPrice:       number
  }[]
}

const POINT_VALUE = 0.01

export async function createOrder(input: CreateOrderInput) {
  return await prisma.$transaction(async (tx) => {
    // Stock reservation
    for (const item of input.items) {
      const inv = await tx.storeInventory.findUnique({
        where: { storeId_productId: { storeId: input.storeId, productId: item.productId } },
      })
      if (!inv) throw new Error(`Product not stocked at this store`)
      const available = inv.quantityOnHand - inv.quantityReserved
      if (available < item.quantityOrdered)
        throw new Error(`Insufficient stock: only ${available} units available`)
      await tx.storeInventory.update({
        where: { storeId_productId: { storeId: input.storeId, productId: item.productId } },
        data:  { quantityReserved: { increment: item.quantityOrdered } },
      })
    }

    const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.quantityOrdered, 0)

    // Loyalty redemption
    let discount = 0
    const pointsToRedeem = input.pointsToRedeem ?? 0
    if (pointsToRedeem > 0 && input.customerId) {
      const customer = await tx.customer.findUnique({ where: { id: input.customerId } })
      if (!customer) throw new Error('Customer not found')
      if (customer.loyaltyPoints < pointsToRedeem) throw new Error('Insufficient loyalty points')
      discount = pointsToRedeem * POINT_VALUE
      await tx.loyaltyTransaction.create({
        data: { customerId: input.customerId, type: 'REDEEM', points: -pointsToRedeem, note: 'Redeemed at POS' },
      })
      await tx.customer.update({
        where: { id: input.customerId },
        data:  { loyaltyPoints: { decrement: pointsToRedeem } },
      })
    }

    const totalAmount  = Math.max(0, subtotal - discount)
    const creditAmount = input.payments.filter(p => p.method === 'CREDIT').reduce((s, p) => s + p.amount, 0)
    const paidAmount   = totalAmount - creditAmount

    // Credit portion — add to customer's credit account balance
    if (creditAmount > 0) {
      if (!input.customerId) throw new Error('Customer required for credit payment')
      const account = await tx.creditAccount.findUnique({ where: { customerId: input.customerId } })
      if (!account) throw new Error('Customer has no credit account. Enable credit in Customer Credit Accounts.')
      if (!account.isActive) throw new Error('Customer credit account is suspended')
      const newBalance = Number(account.currentBalance) + creditAmount
      if (newBalance > Number(account.creditLimit)) throw new Error(
        `Credit limit exceeded. Available: ${Number(account.creditLimit) - Number(account.currentBalance)}`
      )
      await tx.creditAccount.update({
        where: { id: account.id },
        data:  { currentBalance: { increment: new Prisma.Decimal(creditAmount) } },
      })
      await tx.creditTx.create({
        data: { creditAccountId: account.id, type: 'CHARGE', amount: new Prisma.Decimal(creditAmount), note: 'POS sale — pay later' },
      })
    }

    // Determine order status
    let status: OrderStatus
    if (creditAmount === 0)               status = OrderStatus.PAID
    else if (paidAmount > 0)              status = OrderStatus.PARTIAL
    else                                  status = OrderStatus.PENDING

    const seqResult   = await tx.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('order_number_seq')`
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(Number(seqResult[0].nextval)).padStart(5, '0')}`

    // Build payment note
    const paymentNote = input.payments.map(p => `${p.method}: ${p.amount.toFixed(2)}`).join(' + ')

    return tx.order.create({
      data: {
        orderNumber,
        storeId:     input.storeId,
        customerId:  input.customerId ?? null,
        staffId:     input.staffId,
        notes:       [input.notes, paymentNote].filter(Boolean).join(' | ') || null,
        status,
        totalAmount: new Prisma.Decimal(totalAmount),
        paidAt:      status === OrderStatus.PAID ? new Date() : null,
        items: {
          create: input.items.map(i => ({
            productId:        i.productId,
            quantityOrdered:  i.quantityOrdered,
            quantityPickedUp: 0,
            unitPrice:        new Prisma.Decimal(i.unitPrice),
          })),
        },
      },
      include: { items: true },
    })
  })
}
