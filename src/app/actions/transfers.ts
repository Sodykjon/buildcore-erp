'use server'

import { requestTransfer, approveTransfer, shipTransfer, receiveTransfer } from '@/lib/transfers'
import { createActionSupabase } from "@/lib/supabase-server"
import { revalidatePath } from 'next/cache'

export async function requestTransferAction(formData: FormData) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  let items
  try { items = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  const result = await requestTransfer({
    sourceStoreId: formData.get('sourceStoreId') as string,
    destStoreId:   formData.get('destStoreId')   as string,
    requestedById: user.id,
    items,
  })

  revalidatePath('/admin/transfers')
  revalidatePath('/warehouse/fulfillment')
  return result
}

export async function approveTransferAction(transferId: string) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const result = await approveTransfer(transferId, user.id)
  revalidatePath('/admin/transfers')
  return result
}

export async function shipTransferAction(formData: FormData) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  let shipItems
  try { shipItems = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  const result = await shipTransfer({
    transferId:  formData.get('transferId') as string,
    shippedById: user.id,
    items:       shipItems,
  })

  revalidatePath('/admin/transfers')
  return result
}

export async function receiveTransferAction(formData: FormData) {
  const supabase = await createActionSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  let recvItems
  try { recvItems = JSON.parse(formData.get('items') as string) }
  catch { throw new Error('Invalid items data') }

  const result = await receiveTransfer({
    transferId:   formData.get('transferId')  as string,
    receivedById: user.id,
    items:        recvItems,
  })

  revalidatePath('/admin/transfers')
  revalidatePath('/admin')
  return result
}
