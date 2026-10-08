'use server'

import { createClient } from '@/lib/supabase/server'
import { encryptedSupabase } from '@cipherstash/stack-supabase/wasm-inline'
import { encryptedSchemas, getWasmConfig, type UserProfileRow } from '@/src/encryption'
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

  const db = await encryptedSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { schemas: encryptedSchemas, config: getWasmConfig() }
  )

  const { data: profile } = await db
    .from('user_profiles')
    .returns<UserProfileRow>()
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Please complete your profile first.' }
  }

  let suggestedNeeds = 50, suggestedWants = 30, suggestedSavings = 20

  if (profile.marital_status === 'single' && profile.living_situation === 'family_home') {
    suggestedNeeds = 40; suggestedWants = 25; suggestedSavings = 35
  } else if (profile.marital_status === 'single' && profile.living_situation === 'rented') {
    suggestedNeeds = 50; suggestedWants = 25; suggestedSavings = 25
  } else if (profile.marital_status === 'married') {
    suggestedNeeds = 55; suggestedWants = 25; suggestedSavings = 20
  }

  const needs = data.needs_percent ?? suggestedNeeds
  const wants = data.wants_percent ?? suggestedWants
  const savings = data.savings_percent ?? suggestedSavings

  if (needs + wants + savings !== 100) {
    return { error: `Percentages ka total 100% hona chahiye. Abhi ${needs + wants + savings}% hai.` }
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
    suggested: {
      needs: suggestedNeeds,
      wants: suggestedWants,
      savings: suggestedSavings,
    },
  }
}
