import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FEATURE_KEYS = ['feature_delivery', 'feature_credit', 'feature_quotes', 'feature_ap']

export async function GET() {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: FEATURE_KEYS } },
  })
  const found = Object.fromEntries(rows.map(r => [r.key, r.value === 'true']))
  // Always return all keys so the sidebar never hides items due to a missing DB row
  const flags = Object.fromEntries(FEATURE_KEYS.map(k => [k, found[k] ?? false]))
  return NextResponse.json(flags, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
