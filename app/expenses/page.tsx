'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveExpense, deleteExpense, createCategory } from './actions'

export default function ExpensesPage() {
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [addToInventory, setAddToInventory] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  // New Category Modal States
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState('wants')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Categories fetch karo
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, type')
      .or(`user_id.eq.${user.id},is_default.eq.true`)
    if (cats) setCategories(cats)

    // 2. Direct user ke saare expenses uthao (bina kisi allocation ki shart ke)
    const { data: exps, error } = await supabase
      .from('expenses')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })

    if (error) {
      console.error("Error fetching expenses:", error)
      return
    }

    if (exps) {
      setExpenses(exps)
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
      add_to_inventory: addToInventory,
    })

    if (result.error) {
      setStatus(result.error)
    } else {
      setStatus('Expense saved successfully!')
      setAmount('')
      setDescription('')
      setAddToInventory(false)
      fetchData()
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    const result = await deleteExpense(id)
    if (result.error) alert(result.error)
    else fetchData()
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await createCategory(newCatName, newCatType)
    
    if (result.error) {
      alert(result.error)
    } else {
      setShowNewCat(false)
      setNewCatName('')
      fetchData() // Refresh categories list
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-900 dark:text-white relative">
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
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                required
                placeholder="e.g. 1500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <button 
                  type="button" 
                  onClick={() => setShowNewCat(true)} 
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Create new category
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Nike Shoes"
              />

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="inv" 
                checked={addToInventory} 
                onChange={(e) => setAddToInventory(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="inv" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                I bought this as an asset (Add to Inventory)
              </label>
            </div>
</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-lg"
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

      {/* Create Category Modal */}
      {showNewCat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold mb-4">New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                  required
                  placeholder="e.g. Pet Food"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <option value="needs">Needs (Essential)</option>
                  <option value="wants">Wants (Lifestyle)</option>
                  <option value="savings">Savings (Investment)</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewCat(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
