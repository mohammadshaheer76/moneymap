'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveSalary(data: {
  month: string
  net_salary: number
  needs_percent?: number
  wants_percent?: number
  savings_percent?: number
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in.' }
  }

  // 1. Profile fetch karo
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Please complete your profile first.' }
  }

  // 2. Saare budget rules fetch karo (Priority ke hisaab se: chota number pehle)
  const { data: rules } = await supabase
    .from('budget_rules')
    .select('*')
    .order('priority', { ascending: true })

  let suggestedNeeds = 50
  let suggestedWants = 30
  let suggestedSavings = 20

  if (rules && rules.length > 0) {
    // 3. Har rule ko check karo ke kya woh user ke profile se match karta hai
    for (const rule of rules) {
      let matches = true
      const conditions = rule.condition_json as Record<string, any>

      // Agar condition_json khaali hai (Default Rule), toh isko skip karo abhi
      if (!conditions || Object.keys(conditions).length === 0) continue

      for (const [key, value] of Object.entries(conditions)) {
        // Profile object mein value check karo
        const profileValue = (profile as any)[key]
        
        if (profileValue !== value) {
          matches = false
          break
        }
      }

      // Agar sab conditions match ho gayin, toh yeh rule apply karo aur loop tor do
      if (matches) {
        suggestedNeeds = rule.needs_percent
        suggestedWants = rule.wants_percent
        suggestedSavings = rule.savings_percent
        break // Pehla match mil gaya, ab aage mat dekho
      }
    }

    // 4. Agar koi specific rule match nahi hua, toh Default rule lagao
    if (suggestedNeeds === 50 && suggestedWants === 30) {
      const defaultRule = rules.find(r => !r.condition_json || Object.keys(r.condition_json).length === 0)
      if (defaultRule) {
        suggestedNeeds = defaultRule.needs_percent
        suggestedWants = defaultRule.wants_percent
        suggestedSavings = defaultRule.savings_percent
      }
    }
  }

  // 5. Agar user ne manually percentages diye hain, toh unhe use karo
  const needs = data.needs_percent ?? suggestedNeeds
  const wants = data.wants_percent ?? suggestedWants
  const savings = data.savings_percent ?? suggestedSavings

  if (needs + wants + savings !== 100) {
    return { error: `Percentages must add up to 100%. Currently ${needs + wants + savings}%.` }
  }

  const needs_amount = (data.net_salary * needs) / 100
  const wants_amount = (data.net_salary * wants) / 100
  const savings_amount = (data.net_salary * savings) / 100

  const { error } = await supabase
    .from('salary_allocations')
    .upsert(
      {
        user_id: user.id,
        month: data.month,
        net_salary: data.net_salary,
        needs_percent: needs,
        wants_percent: wants,
        savings_percent: savings,
        needs_amount,
        wants_amount,
        savings_amount,
      },
      { onConflict: 'user_id,month' }
    )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/salary')

  return {
    success: true,
    split: { needs, wants, savings, needs_amount, wants_amount, savings_amount },
  }
}
