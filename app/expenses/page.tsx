'use client'

import { useState, useEffect } from 'react'
import { getCategories, createCategory, saveExpense, getMonthlyExpenses } from './actions'

type Category = {
  id: string
  name: string
  type: 'needs' | 'wants' | 'savings'
  is_default: boolean
}

type Expense = {
  id: string
  amount: number
  description: string | null
  expense_date: string
  categories: { name: string; type: string }
}

export default function ExpensesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [allocation, setAllocation] = useState<any>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)

  const [form, setForm] = useState({
    amount: '',
    category_id: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  })

  const [customForm, setCustomForm] = useState({
    name: '',
    type: 'wants' as 'needs' | 'wants' | 'savings',
  })

  const [status, setStatus] = useState('')

  const loadData = async () => {
    const catResult = await getCategories()
    if (catResult.categories) setCategories(catResult.categories)

    const expResult = await getMonthlyExpenses()
    if (expResult.expenses) setExpenses(expResult.expenses)
    if (expResult.allocation) setAllocation(expResult.allocation)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Saving...')

    const result = await saveExpense({
      amount: parseFloat(form.amount),
      category_id: form.category_id,
      description: form.description,
      expense_date: form.expense_date,
    })

    if (result.error) {
      setStatus('Error: ' + result.error)
    } else {
      setStatus('Expense saved successfully.')
      setForm({ ...form, amount: '', description: '' })
      loadData()
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createCategory(customForm)
    if (result.error) {
      setStatus('Error: ' + result.error)
    } else {
      setStatus('Category added successfully.')
      setCustomForm({ name: '', type: 'wants' })
      setShowCustomForm(false)
      loadData()
    }
  }

  const grouped = {
    needs: categories.filter((c) => c.type === 'needs'),
    wants: categories.filter((c) => c.type === 'wants'),
    savings: categories.filter((c) => c.type === 'savings'),
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Expense Tracking</h1>
      <p className="text-sm text-gray-500 mb-6">
        Log your expenses here. Every entry is tracked against its category.
      </p>

      {!allocation && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          Please save this month&apos;s salary first —{' '}
          <a href="/salary" className="text-blue-600 underline">
            Salary page
          </a>
        </div>
      )}

      {/* Expense Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-8 p-4 border rounded bg-gray-50">
        <h2 className="font-bold">New Expense</h2>

        <div>
          <label className="block mb-1 font-medium">Amount (PKR)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full p-2 border rounded"
            required
            min="1"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Category</label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">-- Select a category --</option>
            <optgroup label="Needs">
              {grouped.needs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Wants">
              {grouped.wants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Savings">
              {grouped.savings.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="text-sm text-blue-600 mt-1 underline"
          >
            + Create new category
          </button>
        </div>

        {showCustomForm && (
          <div className="p-3 border rounded bg-white space-y-3">
            <input
              type="text"
              placeholder="Category name (e.g. Netflix)"
              value={customForm.name}
              onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <select
              value={customForm.type}
              onChange={(e) =>
                setCustomForm({ ...customForm, type: e.target.value as any })
              }
              className="w-full p-2 border rounded"
            >
              <option value="needs">Needs</option>
              <option value="wants">Wants</option>
              <option value="savings">Savings</option>
            </select>
            <button
              type="button"
              onClick={handleCreateCategory}
              className="w-full bg-green-600 text-white p-2 rounded"
            >
              Add Category
            </button>
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium">Description (optional)</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="e.g. Dinner with friends"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Date</label>
          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Save Expense
        </button>

        {status && <p className="text-center text-sm">{status}</p>}
      </form>

      {/* This Month's Expenses */}
      <div>
        <h2 className="text-lg font-bold mb-3">This Month&apos;s Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-500">No expenses recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{exp.categories?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">
                    {exp.expense_date} {exp.description && `• ${exp.description}`}
                  </p>
                </div>
                <p className="font-bold">PKR {exp.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
