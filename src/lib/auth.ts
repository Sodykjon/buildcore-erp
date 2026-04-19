import { createServerSupabase } from './supabase-server'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'

export async function getServerProfile() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return prisma.profile.findUnique({
    where: { id: user.id },
    include: { store: true },
  })
}

// Returns 401 response if not authenticated, null if ok (call from API routes)
export async function requireApiAuth(): Promise<NextResponse | null> {
  const profile = await getServerProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}
