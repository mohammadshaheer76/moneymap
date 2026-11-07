'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Target, Plus, Trash2 } from 'lucide-react'

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  
  // New Goal Form State
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchGoals()
  }, [])

  async function fetchGoals() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (data) setGoals(data)
    setLoading(false)
  }

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        name,
        target_amount: Number(targetAmount),
        target_date: targetDate || null,
      })

    if (!error) {
      setShowAdd(false)
      setName('')
      setTargetAmount('')
      setTargetDate('')
      fetchGoals()
    } else {
      alert("Error adding goal: " + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  // Add money to goal AND create an expense entry
  const handleAddMoney = async (id: string, currentSaved: number, goalName: string) => {
    const amountStr = prompt(`How much do you want to add to "${goalName}"? (e.g. 5000)`)
    if (!amountStr) return
    const amount = Number(amountStr)
    if (isNaN(amount) || amount <= 0) return alert("Please enter a valid number.")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Update Goal
    const newSaved = Number(currentSaved) + amount
    const { error: goalError } = await supabase
      .from('goals')
      .update({ saved_amount: newSaved })
      .eq('id', id)
      
    if (goalError) return alert("Error: " + goalError.message)

    // 2. Expense Create karo taake Reports aur Dashboard update ho
    const { data: alloc } = await supabase
      .from('salary_allocations')
      .select('id')
      .eq('user_id', user.id)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!alloc) {
      alert("Goal updated, but no salary found to deduct from. Please save your salary first.")
      fetchGoals()
      return
    }

    // "Savings Goal" category dhoondo
    let { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Savings Goal')
      .eq('type', 'savings')
      .maybeSingle()
    
    // Agar category nahi mili toh error alert do
    if (!cat) {
      alert("System error: 'Savings Goal' category not found in database. Please add it via SQL.")
      fetchGoals()
      return
    }

    // Expense Insert karo
    const { error: expError } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        allocation_id: alloc.id,
        category_id: cat.id,
        amount: amount,
        description: `Saved for ${goalName}`,
        expense_date: new Date().toISOString().split('T')[0],
      })

    if (expError) {
      alert("Goal updated, but failed to create expense entry: " + expError.message)
    } else {
      alert(`Successfully added PKR ${amount} to "${goalName}"!`)
    }

    fetchGoals()
  }

  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-900 dark:text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Saving Goals</h1>
          <p className="text-gray-600 dark:text-gray-400">Set targets for your dreams and track your progress.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
        >
          <Plus size={18} /> New Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4">Create New Goal</h3>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Goal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. New Bike"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Amount (PKR)</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 150000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Date (Optional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Goal</button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      {loading ? (
        <p className="text-center text-gray-500">Loading your goals...</p>
      ) : goals.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
          <Target size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">No goals set yet</h2>
          <p className="text-gray-500 mb-6">Start by creating your first saving goal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const progress = Math.min(100, (Number(goal.saved_amount) / Number(goal.target_amount)) * 100)
            const isCompleted = progress >= 100

            return (
              <div key={goal.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm relative overflow-hidden group">
                {isCompleted && (
                   <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">COMPLETED</div>
                )}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-xl font-bold">{goal.name}</h3>
                    {goal.target_date && (
                      <p className="text-sm text-gray-500">Target: {new Date(goal.target_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400">{formatPKR(Number(goal.saved_amount))}</span>
                    <span className="text-gray-500">{formatPKR(Number(goal.target_amount))}</span>
                  </div>
                  
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-gray-500 font-medium">{Math.round(progress)}% saved</p>
                    <button 
                      onClick={() => handleAddMoney(goal.id, goal.saved_amount, goal.name)}
                      className="text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      + Add Money
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
