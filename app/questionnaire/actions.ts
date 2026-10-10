'use server'

import { encryptedSupabase } from '@cipherstash/stack-supabase/wasm-inline'
import { encryptedSchemas, getWasmConfig, type UserProfileRow } from '@/src/encryption'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveProfile(formData: {
  full_name: string
  age: number
  marital_status: string
  living_situation: string
  family_type: string
  employment_type: string
  dependents_count: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please login first' }
  }

  const es = await encryptedSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { schemas: encryptedSchemas, config: getWasmConfig() }
  )

  // Pehle check karo profile exist karti hai ya nahi
  const { data: existing } = await es
    .from('user_profiles')
    .returns<UserProfileRow>()
    .select('id, user_id, full_name, age, marital_status, living_situation, family_type, employment_type, dependents_count, has_dependents, has_other_income, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  // Saara encrypted data (full_name bhi shamil)
  const encryptedData = {
    full_name: formData.full_name,
    age: formData.age,
    marital_status: formData.marital_status,
    living_situation: formData.living_situation,
    family_type: formData.family_type,
    employment_type: formData.employment_type,
    dependents_count: formData.dependents_count,
  }

  if (existing) {
    // UPDATE
    const { error } = await es
      .from('user_profiles')
      .update(encryptedData)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
  } else {
    // INSERT
    const { error } = await es
      .from('user_profiles')
      .insert({
        user_id: user.id,
        ...encryptedData,
        has_dependents: formData.dependents_count > 0,
        has_other_income: false,
      })

    if (error) return { error: error.message }
  }

  revalidatePath('/questionnaire')
  revalidatePath('/dashboard')
  redirect('/salary')
}
