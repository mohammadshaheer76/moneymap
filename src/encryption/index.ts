import { encryptedTable, types } from '@cipherstash/stack/eql/v3'
import { encryptedSupabase } from '@cipherstash/stack-supabase/wasm-inline'

export const userProfiles = encryptedTable('user_profiles', {
  marital_status: types.TextEq('marital_status'),
  living_situation: types.TextEq('living_situation'),
  family_type: types.TextEq('family_type'),
  employment_type: types.TextEq('employment_type'),
  age: types.IntegerOrd('age'),
  dependents_count: types.IntegerOrd('dependents_count'),
})

export const encryptedSchemas = {
  user_profiles: userProfiles,
} as const

export function getWasmConfig() {
  return {
    workspaceCrn: process.env.CS_WORKSPACE_CRN!,
    clientId: process.env.CS_CLIENT_ID!,
    clientKey: process.env.CS_CLIENT_KEY!,
    accessKey: process.env.CS_CLIENT_ACCESS_KEY!,
  }
}

// Singleton encrypted client — ek baar banao, hamesha reuse karo
let _client: Awaited<ReturnType<typeof encryptedSupabase>> | null = null

export async function getEncryptedClient() {
  if (_client) return _client
  _client = await encryptedSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { schemas: encryptedSchemas, config: getWasmConfig() }
  )
  return _client
}

// ============================================
// Row Types
// ============================================

export type UserProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  age: number | null
  marital_status: string | null
  living_situation: string | null
  family_type: string | null
  employment_type: string | null
  dependents_count: number | null
  has_dependents: boolean
  has_other_income: boolean
  created_at: string
  updated_at: string
}
