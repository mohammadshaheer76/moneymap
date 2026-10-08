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

  const { error } = await es
    .from('user_profiles')
    .returns<UserProfileRow>()
    .upsert(
      {
        user_id: user.id,
        ...formData,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/questionnaire')
  redirect('/salary')
}
