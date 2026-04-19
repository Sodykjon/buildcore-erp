export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerProfile } from '@/lib/auth'

export async function GET() {
  const profile = await getServerProfile()
  if (!profile) return NextResponse.json({ role: null }, { status: 401 })
  return NextResponse.json({ role: profile.role, name: profile.fullName ?? profile.email })
}
