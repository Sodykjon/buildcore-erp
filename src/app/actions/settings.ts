'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== 'ADMIN') throw new Error('Unauthorized')
  return { user, profile }
}

async function getActor() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) throw new Error('Profile not found')
  return { user, profile, supabase }
}

export async function getSystemConfig(): Promise<Record<string, string>> {
  const rows = await prisma.systemConfig.findMany()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function saveSystemConfigAction(formData: FormData) {
  await requireAdmin()
  const loyaltyRate      = formData.get('loyaltyRate')      as string
  const defaultThreshold = formData.get('defaultThreshold') as string

  const updates = [
    { key: 'loyaltyRate',      value: loyaltyRate      || '1'  },
    { key: 'defaultThreshold', value: defaultThreshold || '10' },
  ]

  await Promise.all(updates.map(u =>
    prisma.systemConfig.upsert({
      where:  { key: u.key },
      create: { key: u.key, value: u.value },
      update: { value: u.value },
    })
  ))

  revalidatePath('/admin/settings')
}

const FEATURE_KEYS = ['feature_delivery', 'feature_credit', 'feature_quotes', 'feature_ap'] as const

export async function saveFeatureFlagsAction(formData: FormData) {
  await requireAdmin()
  await Promise.all(FEATURE_KEYS.map(key => {
    const value = formData.get(key) === 'true' ? 'true' : 'false'
    return prisma.systemConfig.upsert({
      where:  { key },
      create: { key, value },
      update: { value },
    })
  }))
  revalidatePath('/admin/settings')
  revalidatePath('/admin')
}

export async function updateProfileAction(formData: FormData) {
  const { user } = await getActor()
  const fullName = (formData.get('fullName') as string).trim()
  if (!fullName) throw new Error('Name is required')

  await prisma.profile.update({
    where: { id: user.id },
    data:  { fullName },
  })

  revalidatePath('/admin/settings')
  revalidatePath('/warehouse/inventory') // refresh sidebar name
}

export async function changePasswordAction(formData: FormData) {
  const { supabase } = await getActor()
  const password    = formData.get('password')    as string
  const confirmPass = formData.get('confirmPass') as string

  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters')
  if (password !== confirmPass) throw new Error('Passwords do not match')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}
