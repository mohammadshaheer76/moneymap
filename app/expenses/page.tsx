'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

function ExpenseForm() {
  const supabase = createClient()
  
  const [selectedMonth, setSelectedMonth] = useState('')
  const [availableMonths, setAvailableMonths] = useState<any[]>([])
  
  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form states
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [addToInventory, setAddToInventory] = useState(false)

  // Naya Category banane ke states
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryType, setNewCategoryType] = useState('needs')

  useEffect(() => {
    const fetchMonths = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: allocations } = await supabase
        .from('salary_allocations')
        .select('month')
        .eq('user_id', user.id)
        .order('month', { ascending: false })

      if (allocations && allocations.length > 0) {
        setAvailableMonths(allocations)
        setSelectedMonth(allocations[0].month)
      } else {
        setLoading(false)
      }
    }
    fetchMonths()
  }, [supabase])

  const fetchData = async () => {
    if (!selectedMonth) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: cats } = await supabase.from('categories').select('*')
    setCategories(cats || [])

    const { data: allocation } = await supabase
      .from('salary_allocations')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', selectedMonth)
      .maybeSingle()

    if (allocation) {
      const { data: exps } = await supabase
        .from('expenses')
        .select('*')
        .eq('allocation_id', allocation.id)
        .order('expense_date', { ascending: false })
      
      setExpenses(exps || [])
    } else {
      setExpenses([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, supabase])

  // Naya Category Add karne ka function
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: newCategoryName,
      type: newCategoryType,
      is_default: false
    })

    if (error) {
      alert("Category error: " + error.message)
    } else {
      setNewCategoryName('')
      setIsAddingCategory(false)
      fetchData() // Categories refresh karo
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: allocation } = await supabase
      .from('salary_allocations')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', selectedMonth)
      .maybeSingle()

    if (!allocation) {
      alert("Pehle is mahine ki salary enter karein!")
      return
    }

    // 1. Expense save karo
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      allocation_id: allocation.id,
      category_id: categoryId,
      amount: parseFloat(amount),
      description: description,
      expense_date: date
    })

    if (error) {
      alert("Expense Error: " + error.message)
      return
    }

    // 2. Agar Inventory ka checkbox tick hai, toh asset save karo
    if (addToInventory) {
      const { error: invError } = await supabase.from('inventory').insert({
        user_id: user.id,
        name: description || 'Unnamed Asset',
        purchase_price: parseFloat(amount),
        purchase_date: date,
        category: categories.find(c => c.id === categoryId)?.name || 'General'
      })

      if (invError) {
        alert("Expense saved, but Inventory error: " + invError.message)
      }
    }

    // Reset form
    setAmount('')
    setDescription('')
    setAddToInventory(false)
    fetchData() // List refresh karo
  }

  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`

  if (availableMonths.length === 0 && !loading) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Salary Data Found</h2>
        <p className="text-gray-500">Please go to the Salary page and enter your salary first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expense Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Log your expenses here. Every entry is tracked against its category.</p>
        </div>
        
        <div className="bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 bg-transparent text-sm font-bold focus:outline-none cursor-pointer"
          >
            {availableMonths.map((alloc) => (
              <option key={alloc.month} value={alloc.month}>
                {new Date(alloc.month).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">New Expense</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (PKR)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="e.g. 1500" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-xs text-blue-600 hover:underline">
                  + Create new category
                </button>
              </div>

              {isAddingCategory ? (
                <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2 mb-2">
                  <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Category Name" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 text-sm" />
                  <select value={newCategoryType} onChange={e => setNewCategoryType(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 text-sm">
                    <option value="needs">Needs</option>
                    <option value="wants">Wants</option>
                    <option value="savings">Savings</option>
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddCategory} className="flex-1 bg-blue-600 text-white py-1 rounded text-sm">Save</button>
                    <button type="button" onClick={() => setIsAddingCategory(false)} className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white py-1 rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
                  <option value="">-- Select a category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="e.g. Nike Shoes" />
            </div>

            <div className="flex items-center gap-2 pt-2 pb-2">
              <input 
                type="checkbox" 
                id="inventory"
                checked={addToInventory}
                onChange={(e) => setAddToInventory(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="inventory" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                I bought this as an asset (Add to Inventory)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors mt-2">
              Add Expense
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="md:col-span-2">
          <h2 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
            Expenses for {new Date(selectedMonth).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </h2>
          
          {loading ? (
            <div className="text-gray-500">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-gray-500">Is mahine ka koi kharcha record nahi mila.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(exp => {
                const cat = categories.find(c => c.id === exp.category_id)
                return (
                  <div key={exp.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{exp.description || cat?.name}</p>
                      <p className="text-xs text-gray-500">{exp.expense_date} • {cat?.name}</p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(exp.amount)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading page...</div>}>
      <ExpenseForm />
    </Suspense>
  )
}
