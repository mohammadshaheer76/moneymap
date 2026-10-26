'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveExpense, deleteExpense } from './actions'

export default function ExpensesPage() {
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch categories
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, type')
      .or(`user_id.eq.${user.id},is_default.eq.true`)
    if (cats) setCategories(cats)

    // Fetch current month's expenses
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    
    const { data: alloc } = await supabase
      .from('salary_allocations')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single()

    if (alloc) {
      const { data: exps } = await supabase
        .from('expenses')
        .select('*, categories(name)')
        .eq('allocation_id', alloc.id)
        .order('expense_date', { ascending: false })
      if (exps) setExpenses(exps)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('')

    const result = await saveExpense({
      amount: Number(amount),
      category_id: categoryId,
      description,
      expense_date: date,
    })

    if (result.error) {
      setStatus(result.error)
    } else {
      setStatus('Expense saved successfully!')
      setAmount('')
      setDescription('')
      fetchData() // Refresh list
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    const result = await deleteExpense(id)
    if (result.error) {
      alert(result.error)
    } else {
      fetchData() // Refresh list
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-900 dark:text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Expense Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400">Log your expenses here. Every entry is tracked against its category.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">New Expense</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (PKR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
                placeholder="e.g. 1500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              >
                <option value="">-- Select a category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. Dinner with friends"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Saving...' : 'Save Expense'}
            </button>

            {status && (
              <p className={`text-sm text-center mt-2 ${status.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                {status}
              </p>
            )}
          </form>
        </div>

        {/* Expense List Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">This Month's Expenses</h2>
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No expenses logged yet.</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center group">
                  <div>
                    <p className="font-medium">{exp.categories?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{exp.expense_date} {exp.description && `• ${exp.description}`}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold">PKR {Number(exp.amount).toLocaleString()}</p>
                    <button 
                      onClick={() => handleDelete(exp.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete expense"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
