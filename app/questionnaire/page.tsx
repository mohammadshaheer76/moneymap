'use client'

import { useState } from 'react'
import { saveProfile } from './actions'

export default function QuestionnairePage() {
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    marital_status: 'single',
    living_situation: 'family_home',
    family_type: 'nuclear',
    employment_type: 'salaried',
    dependents_count: '0',
  })
  const [status, setStatus] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Saving...')

    const result = await saveProfile({
      full_name: formData.full_name,
      age: parseInt(formData.age),
      marital_status: formData.marital_status,
      living_situation: formData.living_situation,
      family_type: formData.family_type,
      employment_type: formData.employment_type,
      dependents_count: parseInt(formData.dependents_count),
    })

    if (result.error) {
      setStatus('Error: ' + result.error)
    } else {
      setStatus('Profile saved successfully!')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Full Name</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Muhammad Shaheer"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Age</label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Marital Status</label>
          <select
            value={formData.marital_status}
            onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Living Situation</label>
          <select
            value={formData.living_situation}
            onChange={(e) => setFormData({ ...formData, living_situation: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="family_home">Family Home</option>
            <option value="rented">Rented</option>
            <option value="owned">Owned</option>
            <option value="hostel">Hostel</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Family Type</label>
          <select
            value={formData.family_type}
            onChange={(e) => setFormData({ ...formData, family_type: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="nuclear">Nuclear</option>
            <option value="joint">Joint</option>
            <option value="alone">Alone</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Employment Type</label>
          <select
            value={formData.employment_type}
            onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="salaried">Salaried</option>
            <option value="self_employed">Self Employed</option>
            <option value="freelancer">Freelancer</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Dependents Count</label>
          <input
            type="number"
            value={formData.dependents_count}
            onChange={(e) => setFormData({ ...formData, dependents_count: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Save Profile
        </button>

        {status && <p className="text-center mt-4">{status}</p>}
      </form>
    </div>
  )
}
