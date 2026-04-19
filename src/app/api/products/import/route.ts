import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const deny = await requireApiAuth()
  if (deny) return deny
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 })

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const idx = (name: string) => headers.indexOf(name)

    const errors: string[] = []
    let created = 0
    let updated = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i])
      const rowNum = i + 1
      try {
        const name      = cols[idx('name')]?.trim()
        const sku       = cols[idx('sku')]?.trim()
        const barcode   = cols[idx('barcode')]?.trim()
        const catName   = cols[idx('category')]?.trim()
        const unit      = cols[idx('unit')]?.trim() || 'piece'
        const costPrice = parseFloat(cols[idx('costprice')] || '0')
        const sellPrice = parseFloat(cols[idx('sellprice')] || '0')
        const threshold = parseInt(cols[idx('lowstockthreshold')] || '0', 10)
        const desc      = cols[idx('description')]?.trim() || null

        if (!name || !sku || !barcode || !catName) {
          errors.push(`Row ${rowNum}: missing required field (name, sku, barcode, category)`)
          continue
        }
        if (isNaN(costPrice) || isNaN(sellPrice)) {
          errors.push(`Row ${rowNum}: invalid price`)
          continue
        }

        const category = await prisma.category.upsert({
          where:  { name: catName },
          create: { name: catName },
          update: {},
        })

        const existing = await prisma.product.findUnique({ where: { sku } })
        if (existing) {
          await prisma.product.update({
            where: { sku },
            data:  { name, barcode, unit, costPrice, sellPrice, categoryId: category.id, description: desc },
          })
          // Update low stock thresholds across all store inventories
          if (threshold > 0) {
            await prisma.storeInventory.updateMany({
              where: { productId: existing.id },
              data:  { lowStockThreshold: threshold },
            })
          }
          updated++
        } else {
          await prisma.product.create({
            data: { name, sku, barcode, unit, costPrice, sellPrice, categoryId: category.id, description: desc },
          })
          created++
        }
      } catch (e) {
        errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : 'unknown error'}`)
      }
    }

    return NextResponse.json({ created, updated, errors })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Import failed' }, { status: 500 })
  }
}

function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}
