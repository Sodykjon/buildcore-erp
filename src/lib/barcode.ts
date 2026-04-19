import { prisma } from './prisma'

function generateBarcodeValue(categoryCode: string): string {
  const ts   = Date.now().toString().slice(-8)
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `MAT-${categoryCode.toUpperCase().slice(0, 2)}-${ts}-${rand}`
}

export async function generateUniqueBarcode(categoryCode: string): Promise<string> {
  let barcode: string
  let attempts = 0

  do {
    barcode = generateBarcodeValue(categoryCode)
    const exists = await prisma.product.findUnique({ where: { barcode } })
    if (!exists) return barcode
    attempts++
  } while (attempts < 5)

  throw new Error('Failed to generate unique barcode after 5 attempts')
}
