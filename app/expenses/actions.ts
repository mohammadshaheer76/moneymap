'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Categories fetch karo (default + user ki custom)
export async function getCategories() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in' }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${user.id}`)
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (error) return { error: error.message }
    return { categories: data }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Nayi custom category banao
export async function createCategory(data: {
  name: string
  type: 'needs' | 'wants' | 'savings'
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in' }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: data.name,
        type: data.type,
        is_default: false,
      })
      .select()
      .single()

    if (error) return { error: error.message }
    return { category }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Expense save karo
export async function saveExpense(data: {
  amount: number
  category_id: string
  description?: string
  expense_date: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in' }

    // Current month ka allocation dhoondo
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const { data: allocation, error: allocError } = await supabase
      .from('salary_allocations')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', monthStart)
      .single()

    if (allocError || !allocation) {
      return { error: `Please save this month's salary first.` }
    }

    const { error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        allocation_id: allocation.id,
        category_id: data.category_id,
        amount: data.amount,
        description: data.description || null,
        expense_date: data.expense_date,
      })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

// Is mahine ke expenses fetch karo
export async function getMonthlyExpenses() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in' }

    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const { data: allocation } = await supabase
      .from('salary_allocations')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', monthStart)
      .single()

    if (!allocation) return { allocation: null, expenses: [] }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, categories(name, type)')
      .eq('user_id', user.id)
      .eq('allocation_id', allocation.id)
      .order('expense_date', { ascending: false })

    if (error) return { error: error.message }
    return { allocation, expenses: expenses || [] }
  } catch (err: any) {
    return { error: err.message }
  }
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
