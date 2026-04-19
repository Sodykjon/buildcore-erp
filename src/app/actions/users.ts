'use server'

import { prisma } from '@/lib/prisma'
import { createActionSupabase } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile || profile.role !== 'ADMIN') throw new Error('Unauthorized')
  return profile
}

function getAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  return createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function createUserAction(formData: FormData) {
  await requireAdmin()

  const email    = (formData.get('email')    as string).trim().toLowerCase()
  const fullName = (formData.get('fullName') as string).trim()
  const password = formData.get('password')  as string
  const role     = formData.get('role')      as 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF'
  const storeId  = (formData.get('storeId') as string | null) || null

  if (!email || !fullName || !password || !role) throw new Error('All fields required')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  const admin = getAdminClient()

  // Create Supabase auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) throw new Error(authError.message)

  const userId = authData.user!.id

  // Upsert profile — auth trigger may have already inserted a row
  await prisma.profile.upsert({
    where:  { id: userId },
    create: { id: userId, email, fullName, role, storeId },
    update: { email, fullName, role, storeId },
  })

  revalidatePath('/admin/users')
  return { id: userId, email, fullName, role }
}

export async function updateUserAction(formData: FormData) {
  await requireAdmin()

  const id       = formData.get('id')       as string
  const fullName = (formData.get('fullName') as string).trim()
  const role     = formData.get('role')      as 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF'
  const storeId  = (formData.get('storeId') as string | null) || null

  await prisma.profile.update({ where: { id }, data: { fullName, role, storeId } })
  revalidatePath('/admin/users')
}

export async function resetUserPasswordAction(formData: FormData) {
  await requireAdmin()

  const id       = formData.get('id')       as string
  const password = formData.get('password') as string

  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters')

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
}

export async function deleteUserAction(id: string) {
  await requireAdmin()

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)

  await prisma.profile.delete({ where: { id } })
  revalidatePath('/admin/users')
}
