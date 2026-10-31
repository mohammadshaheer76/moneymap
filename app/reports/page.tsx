import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: allocation } = await supabase
    .from('salary_allocations')
    .select('id, month, net_salary, needs_amount, wants_amount, savings_amount, needs_spent, wants_spent, savings_spent')
    .eq('user_id', user.id)
    .eq('month', currentMonth)
    .maybeSingle()

  if (!allocation) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">No Data Available</h1>
        <p className="text-gray-500">Please enter your salary for this month first.</p>
      </div>
    )
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category_id, description, expense_date, categories(name, type)')
    .eq('allocation_id', allocation.id)
    .order('expense_date', { ascending: false })

  // Group by category for the report
  const categoryTotals: Record<string, { name: string; type: string; total: number; items: any[] }> = {}
  
  for (const exp of expenses || []) {
    const cat = exp.categories as any
    if (!cat) continue
    const amt = Number(exp.amount)
    
    if (!categoryTotals[cat.name]) {
      categoryTotals[cat.name] = { name: cat.name, type: cat.type, total: 0, items: [] }
    }
    categoryTotals[cat.name].total += amt
    categoryTotals[cat.name].items.push({
      desc: exp.description || 'No description',
      amount: amt,
      date: exp.expense_date
    })
  }

  const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total)
  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-900 dark:text-white space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Detailed Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Full breakdown of your spending for {new Date(allocation.month).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Needs Spent</p>
          <p className="font-bold text-blue-700 dark:text-blue-300">{formatPKR(allocation.needs_spent || 0)}</p>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Wants Spent</p>
          <p className="font-bold text-amber-700 dark:text-amber-300">{formatPKR(allocation.wants_spent || 0)}</p>
        </div>
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Savings Spent</p>
          <p className="font-bold text-emerald-700 dark:text-emerald-300">{formatPKR(allocation.savings_spent || 0)}</p>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Total Spent</p>
          <p className="font-bold text-purple-700 dark:text-purple-300">
            {formatPKR((allocation.needs_spent || 0) + (allocation.wants_spent || 0) + (allocation.savings_spent || 0))}
          </p>
        </div>
      </div>

      {/* Detailed List */}
      <div className="space-y-6">
        {sortedCategories.map((cat) => (
          <div key={cat.name} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">{cat.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                  cat.type === 'needs' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  cat.type === 'wants' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                }`}>
                  {cat.type}
                </span>
              </div>
              <p className="font-bold">{formatPKR(cat.total)}</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {cat.items.map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.desc}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                  <p className="font-semibold">{formatPKR(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
