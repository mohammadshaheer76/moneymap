// CipherStash removed — using Supabase default encryption (AES-256 + TLS)
// Yeh file future mein encryption add karne ke liye rakhi hai

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
