'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveSalary } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function SalaryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [month, setMonth] = useState('')
  const [salary, setSalary] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [isEdit, setIsEdit] = useState(false)
  const [needs, setNeeds] = useState(50)
  const [wants, setWants] = useState(30)
  const [savings, setSavings] = useState(20)
  const [suggested, setSuggested] = useState<{ needs: number; wants: number; savings: number } | null>(null)

  useEffect(() => {
    const init = async () => {
      const d = new Date()
      const defaultMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      setMonth(defaultMonth)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingExisting(false); return }

      const { data } = await supabase
        .from('salary_allocations')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', defaultMonth)
        .maybeSingle()

      if (data) {
        setSalary(String(data.net_salary))
        setNeeds(data.needs_percent)
        setWants(data.wants_percent)
        setSavings(data.savings_percent)
        setIsEdit(true)
        setStatus('Is mahine ki salary already saved hai. Aap edit kar sakte ho.')
      }
      setLoadingExisting(false)
    }
    init()
  }, [])

  const total = needs + wants + savings
  const isValid = total === 100 && salary && parseFloat(salary) > 0
  const needsAmount = salary ? (parseFloat(salary) * needs) / 100 : 0
  const wantsAmount = salary ? (parseFloat(salary) * wants) / 100 : 0
  const savingsAmount = salary ? (parseFloat(salary) * savings) / 100 : 0
  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`

  const applySuggestion = () => {
    if (!suggested) return
    setNeeds(suggested.needs); setWants(suggested.wants); setSavings(suggested.savings)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setStatus('Saving...')

    const result = await saveSalary({
      month,
      net_salary: parseFloat(salary),
      needs_percent: needs,
      wants_percent: wants,
      savings_percent: savings,
    })

    if (result?.error) {
      setStatus('Error: ' + result.error)
      setLoading(false)
    } else {
      setStatus('✓ Salary allocation saved successfully.')
      if (result.suggested) setSuggested(result.suggested)
      setLoading(false)
      router.refresh()
    }
  }

  if (loadingExisting) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Monthly Salary</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {isEdit ? 'Edit this month\'s salary and split.' : 'Enter your salary to get a suggested split.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Month</label>
              <input
                type="date"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Net Salary (PKR)</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g. 100000"
                required
                min="1"
              />
            </div>
          </div>
        </div>

        {salary && parseFloat(salary) > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Split Allocation</h2>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                total === 100 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                Total: {total}%
              </span>
            </div>

            {suggested && (
              <div className="flex items-center justify-between text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg">
                <span>
                  💡 Suggested: {suggested.needs}% / {suggested.wants}% / {suggested.savings}%
                </span>
                <button type="button" onClick={applySuggestion} className="font-medium underline hover:no-underline">
                  Apply
                </button>
              </div>
            )}

            {[
              { label: 'Needs', value: needs, set: setNeeds, amount: needsAmount, color: 'blue' },
              { label: 'Wants', value: wants, set: setWants, amount: wantsAmount, color: 'amber' },
              { label: 'Savings', value: savings, set: setSavings, amount: savingsAmount, color: 'green' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-2">
                  <label className="font-medium text-gray-900 dark:text-white">{item.label}</label>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.value}% — <span className="font-medium text-gray-900 dark:text-white">{formatPKR(item.amount)}</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={item.value}
                  onChange={(e) => item.set(parseInt(e.target.value))}
                  className={`w-full accent-${item.color}-500`}
                />
              </div>
            ))}

            {total !== 100 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠ Total exactly 100% hona chahiye. Abhi {total}% hai.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : isEdit ? 'Update Salary' : 'Save Salary'}
        </button>

        {status && (
          <p className={`text-center text-sm ${
            status.includes('Error') ? 'text-red-600 dark:text-red-400' :
            status.includes('✓') ? 'text-green-600 dark:text-green-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {status}
          </p>
        )}
      </form>
    </div>
  )
}
