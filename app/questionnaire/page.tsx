'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveProfile } from './actions'
import { useRouter } from 'next/navigation'

export default function QuestionnairePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    marital_status: 'single',
    living_situation: 'family_home',
    family_type: 'nuclear',
    employment_type: 'salaried',
    dependents_count: '0',
  })

  const supabase = createClient()
  const router = useRouter()

  // Load existing profile data
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          age: data.age ? String(data.age) : '',
          marital_status: data.marital_status || 'single',
          living_situation: data.living_situation || 'family_home',
          family_type: data.family_type || 'nuclear',
          employment_type: data.employment_type || 'salaried',
          dependents_count: data.dependents_count ? String(data.dependents_count) : '0',
        })
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus('')

    const result = await saveProfile({
      full_name: formData.full_name,
      age: Number(formData.age),
      marital_status: formData.marital_status,
      living_situation: formData.living_situation,
      family_type: formData.family_type,
      employment_type: formData.employment_type,
      dependents_count: Number(formData.dependents_count),
    })

    if (result?.error) {
      setStatus(result.error)
      setSaving(false)
    } else {
      setStatus('Profile saved successfully!')
      // Redirect after short delay so user sees success message
      setTimeout(() => {
        router.push('/salary')
        router.refresh()
      }, 1000)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading profile...</div>
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4 text-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Muhammad Shaheer"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Age</label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Marital Status</label>
          <select
            value={formData.marital_status}
            onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Living Situation</label>
          <select
            value={formData.living_situation}
            onChange={(e) => setFormData({ ...formData, living_situation: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="family_home">Family Home</option>
            <option value="rented">Rented</option>
            <option value="owned">Owned</option>
            <option value="hostel">Hostel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Family Type</label>
          <select
            value={formData.family_type}
            onChange={(e) => setFormData({ ...formData, family_type: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="nuclear">Nuclear</option>
            <option value="joint">Joint</option>
            <option value="alone">Alone</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Employment Type</label>
          <select
            value={formData.employment_type}
            onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="salaried">Salaried</option>
            <option value="self_employed">Self Employed</option>
            <option value="freelancer">Freelancer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Dependents Count</label>
          <input
            type="number"
            value={formData.dependents_count}
            onChange={(e) => setFormData({ ...formData, dependents_count: e.target.value })}
            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 mt-4"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        {status && (
          <p className={`text-center text-sm font-medium mt-2 ${status.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
            {status}
          </p>
        )}
      </form>
    </div>
  )
}
