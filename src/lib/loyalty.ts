import { prisma } from './prisma'
import { LoyaltyTxType } from '@prisma/client'

const POINTS_PER_UNIT_CURRENCY = 1
const POINT_VALUE_IN_CURRENCY  = 0.01

export function calculatePointsEarned(orderTotal: number): number {
  return Math.floor(orderTotal * POINTS_PER_UNIT_CURRENCY)
}

export async function awardPoints(customerId: string | null, orderId: string, orderTotal: number) {
  if (!customerId) return
  const points = calculatePointsEarned(orderTotal)
  if (points <= 0) return

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: { customerId, type: LoyaltyTxType.EARN, points, orderId },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data:  { loyaltyPoints: { increment: points } },
    }),
  ])
}

export async function redeemPoints(
  customerId:     string,
  pointsToRedeem: number
): Promise<{ discountAmount: number }> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer)                              throw new Error('Customer not found')
  if (customer.loyaltyPoints < pointsToRedeem) {
    throw new Error(`Insufficient points: has ${customer.loyaltyPoints}, needs ${pointsToRedeem}`)
  }

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: { customerId, type: LoyaltyTxType.REDEEM, points: -pointsToRedeem },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data:  { loyaltyPoints: { decrement: pointsToRedeem } },
    }),
  ])

  return { discountAmount: pointsToRedeem * POINT_VALUE_IN_CURRENCY }
}
