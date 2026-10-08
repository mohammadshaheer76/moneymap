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

  const { data: allocation, error: allocError } = await supabase
    .from('salary_allocations')
    .select('*')
    .eq('id', allocationId)
    .eq('user_id', user.id)
    .single()

  if (allocError || !allocation) {
    return { error: 'Allocation not found' }
  }

  const { data: expenses, error: expError } = await supabase
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

    const amount = Number(exp.amount)

    if (cat.type === 'needs') needs_spent += amount
    else if (cat.type === 'wants') wants_spent += amount
    else if (cat.type === 'savings') savings_spent += amount

    const key = cat.id
    if (!categoryTotals[key]) {
      categoryTotals[key] = { name: cat.name, type: cat.type, total: 0 }
    }
    categoryTotals[key].total += amount
  }

  const netSalary = Number(allocation.net_salary)
  const needsAmount = Number(allocation.needs_amount)
  const wantsAmount = Number(allocation.wants_amount)
  const savingsAmount = Number(allocation.savings_amount)

  const total_spent = needs_spent + wants_spent + savings_spent
  const total_saved = savings_spent
  const savings_rate = netSalary > 0 ? (total_saved / netSalary) * 100 : 0
  const needs_utilization = needsAmount > 0 ? (needs_spent / needsAmount) * 100 : 0
  const wants_utilization = wantsAmount > 0 ? (wants_spent / wantsAmount) * 100 : 0

  const overspent: Array<{ category: string; budget: number; spent: number }> = []
  for (const data of Object.values(categoryTotals)) {
    let budget = 0
    if (data.type === 'needs') budget = needsAmount
    else if (data.type === 'wants') budget = wantsAmount
    else if (data.type === 'savings') budget = savingsAmount

    if (data.total > budget) {
      overspent.push({ category: data.name, budget, spent: data.total })
    }
  }

  const { error: saveError } = await supabase
    .from('monthly_summary')
    .upsert(
      {
        user_id: user.id,
        allocation_id: allocationId,
        month: allocation.month,
        total_income: netSalary,
        needs_budget: needsAmount,
        needs_spent,
        wants_budget: wantsAmount,
        wants_spent,
        savings_budget: savingsAmount,
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
