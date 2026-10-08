import { Encryption, encryptedTable, types } from '@cipherstash/stack/v3'

export const userProfiles = encryptedTable('user_profiles', {
  full_name: types.TextEq('full_name'),
  marital_status: types.TextEq('marital_status'),
  living_situation: types.TextEq('living_situation'),
  family_type: types.TextEq('family_type'),
  employment_type: types.TextEq('employment_type'),
  age: types.IntegerOrd('age'),
  dependents_count: types.IntegerOrd('dependents_count'),
})

export const encryptionClient = await Encryption({
  schemas: [userProfiles],
})
