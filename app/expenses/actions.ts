'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveExpense(data: {
  amount: number
  category_id: string
  description: string
  expense_date: string
  add_to_inventory?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not logged in' }

  // Latest salary allocation fetch karo
  const { data: allocation, error: allocError } = await supabase
    .from('salary_allocations')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (allocError || !allocation) {
    return { error: 'Please save this month\'s salary first.' }
  }

  // 1. Expense save karo
  const { error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      allocation_id: allocation.id,
      category_id: data.category_id,
      amount: data.amount,
      description: data.description,
      expense_date: data.expense_date,
    })

  if (error) return { error: error.message }

  // 2. Agar 'Add to Inventory' check kiya hai, toh inventory mein bhi save karo
  if (data.add_to_inventory) {
    await supabase.from('inventory').insert({
      user_id: user.id,
      item_name: data.description || 'Unknown Item',
      purchase_price: data.amount,
      purchase_date: data.expense_date,
      category: 'Purchased'
    })
  }

  revalidatePath('/expenses')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function createCategory(name: string, type: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name,
      type,
      is_default: false
    })

  if (error) return { error: error.message }
  
  revalidatePath('/expenses')
  return { success: true }
}
