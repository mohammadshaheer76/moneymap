'use server'

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

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        full_name: formData.full_name,
        age: formData.age,
        marital_status: formData.marital_status,
        living_situation: formData.living_situation,
        family_type: formData.family_type,
        employment_type: formData.employment_type,
        dependents_count: formData.dependents_count,
        has_dependents: formData.dependents_count > 0,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/questionnaire')
  revalidatePath('/dashboard')
  redirect('/salary')
}
