'use server'

import { encryptedSupabase } from '@cipherstash/stack-supabase'
import { createClient } from '@/lib/supabase/server'

export async function generateMonthlySummary(allocationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please login first' }
  }

  const es = await encryptedSupabase(supabase)

  const { data: allocation, error: allocError } = await es
    .from('salary_allocations')
    .select('*')
    .eq('id', allocationId)
    .eq('user_id', user.id)
    .single()

  if (allocError || !allocation) {
    return { error: 'Allocation not found' }
  }

  const { data: expenses, error: expError } = await es
    .from('expenses')
    .select('amount, category_id')
    .eq('allocation_id', allocationId)

  if (expError) {
    return { error: expError.message }
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type')

  const categoryMap = new Map(
    (categories || []).map((c) => [c.id, c])
  )

  let needs_spent = 0
  let wants_spent = 0
  let savings_spent = 0
  const categoryTotals: Record<string, { name: string; type: string; total: number }> = {}

  for (const exp of expenses || []) {
    const cat = categoryMap.get(exp.category_id)
    if (!cat) continue

    if (cat.type === 'needs') needs_spent += exp.amount
    else if (cat.type === 'wants') wants_spent += exp.amount
    else if (cat.type === 'savings') savings_spent += exp.amount

    const key = cat.id
    if (!categoryTotals[key]) {
      categoryTotals[key] = { name: cat.name, type: cat.type, total: 0 }
    }
    categoryTotals[key].total += exp.amount
  }

  const total_spent = needs_spent + wants_spent + savings_spent
  const total_saved = savings_spent
  const savings_rate = allocation.net_salary > 0
    ? (total_saved / allocation.net_salary) * 100
    : 0
  const needs_utilization = allocation.needs_amount > 0
    ? (needs_spent / allocation.needs_amount) * 100
    : 0
  const wants_utilization = allocation.wants_amount > 0
    ? (wants_spent / allocation.wants_amount) * 100
    : 0

  const overspent: Array<{ category: string; budget: number; spent: number }> = []
  for (const data of Object.values(categoryTotals)) {
    let budget = 0
    if (data.type === 'needs') budget = allocation.needs_amount
    else if (data.type === 'wants') budget = allocation.wants_amount
    else if (data.type === 'savings') budget = allocation.savings_amount

    if (data.total > budget) {
      overspent.push({ category: data.name, budget, spent: data.total })
    }
  }

  const { error: saveError } = await es
    .from('monthly_summary')
    .upsert(
      {
        user_id: user.id,
        allocation_id: allocationId,
        month: allocation.month,
        total_income: allocation.net_salary,
        needs_budget: allocation.needs_amount,
        needs_spent,
        wants_budget: allocation.wants_amount,
        wants_spent,
        savings_budget: allocation.savings_amount,
        savings_spent,
        total_spent,
        total_saved,
        savings_rate,
        needs_utilization,
        wants_utilization,
        overspent_categories: overspent,
      },
      { onConflict: 'allocation_id' }
    )

  if (saveError) {
    return { error: saveError.message }
  }

  return { success: true }
}
