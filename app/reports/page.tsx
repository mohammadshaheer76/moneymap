import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Dashboard jaisa hi current month logic use karo
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: allocation } = await supabase
    .from('salary_allocations')
    .select('id, month, net_salary, needs_amount, wants_amount, savings_amount')
    .eq('user_id', user.id)
    .eq('month', currentMonth)
    .maybeSingle()

  if (!allocation) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">No Data Available</h1>
        <p className="text-gray-500 mb-6">Please enter your salary for this month first.</p>
        <Link href="/salary" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg">Enter Salary</Link>
      </div>
    )
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category_id, description, expense_date, categories(name, type)')
    .eq('allocation_id', allocation.id)
    .order('expense_date', { ascending: false })

  // Calculate Totals
  let needs_spent = 0, wants_spent = 0, savings_spent = 0
  
  const categoryTotals: Record<string, { name: string; type: string; total: number; items: any[] }> = {}
  
  for (const exp of expenses || []) {
    const cat = exp.categories as any
    if (!cat) continue
    const amt = Number(exp.amount)
    
    if (cat.type === 'needs') needs_spent += amt
    else if (cat.type === 'wants') wants_spent += amt
    else if (cat.type === 'savings') savings_spent += amt

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


  // Chart Data Calculation
  const totalSpent = needs_spent + wants_spent + savings_spent;
  const needsPct = totalSpent > 0 ? (needs_spent / totalSpent) * 100 : 0;
  const wantsPct = totalSpent > 0 ? (wants_spent / totalSpent) * 100 : 0;
  const savingsPct = totalSpent > 0 ? (savings_spent / totalSpent) * 100 : 0;

  // SVG conic-gradient style pie chart ke liye
  const pieChartStyle = {
    background: `conic-gradient(
      #3b82f6 0% ${needsPct}%, 
      #f59e0b ${needsPct}% ${needsPct + wantsPct}%, 
      #10b981 ${needsPct + wantsPct}% 100%
    )`
  };

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
          <p className="font-bold text-blue-700 dark:text-blue-300">{formatPKR(needs_spent)}</p>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Wants Spent</p>
          <p className="font-bold text-amber-700 dark:text-amber-300">{formatPKR(wants_spent)}</p>
        </div>
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Savings Spent</p>
          <p className="font-bold text-emerald-700 dark:text-emerald-300">{formatPKR(savings_spent)}</p>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Total Spent</p>
          <p className="font-bold text-purple-700 dark:text-purple-300">{formatPKR(needs_spent + wants_spent + savings_spent)}</p>
        </div>
      </div>


      {/* Pie Chart Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm mb-8">
        <h3 className="font-bold text-lg mb-6">Spending Breakdown</h3>
        {totalSpent === 0 ? (
          <p className="text-gray-500">No expenses to show.</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* The Chart */}
            <div className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-inner" style={pieChartStyle}>
              <div className="w-32 h-32 bg-white dark:bg-gray-900 rounded-full flex flex-col items-center justify-center shadow-lg">
                <span className="text-xs text-gray-500">Total</span>
                <span className="font-bold text-lg">{formatPKR(totalSpent)}</span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium">Needs</span>
                </div>
                <span className="text-sm font-bold">{Math.round(needsPct)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium">Wants</span>
                </div>
                <span className="text-sm font-bold">{Math.round(wantsPct)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium">Savings</span>
                </div>
                <span className="text-sm font-bold">{Math.round(savingsPct)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed List */}
      <div className="space-y-6">
        {sortedCategories.length === 0 ? (
          <p className="text-center text-gray-500">No expenses found for this month.</p>
        ) : (
          sortedCategories.map((cat) => (
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
                      <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <p className="font-semibold">{formatPKR(item.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
