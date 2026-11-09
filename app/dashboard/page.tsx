import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const resolvedParams = await searchParams;
  const requestedMonth = resolvedParams.month;

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, user_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: allAllocations } = await supabase
    .from('salary_allocations')
    .select('month')
    .eq('user_id', user.id)
    .order('month', { ascending: false })

  let selectedMonth = requestedMonth;
  if (!selectedMonth && allAllocations && allAllocations.length > 0) {
    selectedMonth = allAllocations[0].month;
  }

  let allocation = null
  if (selectedMonth) {
    const { data } = await supabase
      .from('salary_allocations')
      .select('id, user_id, month, net_salary, needs_percent, wants_percent, savings_percent, needs_amount, wants_amount, savings_amount, rule_id, created_at')
      .eq('user_id', user.id)
      .eq('month', selectedMonth)
      .maybeSingle()
    allocation = data
  }

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(2)

  let summary = null
  if (allocation) {
    // FIX: Sirf us allocation_id ke expenses fetch karo, na ke saare user ke
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category_id, description, expense_date')
      .eq('allocation_id', allocation.id) // <--- Yeh line sabse important hai

    const { data: categories } = await supabase.from('categories').select('id, name, type')
    const categoryMap = new Map((categories || []).map((c) => [c.id, c]))

    let needs_spent = 0, wants_spent = 0, savings_spent = 0
    const flatExpenses: any[] = []

    for (const exp of expenses || []) {
      const cat = categoryMap.get(exp.category_id)
      if (!cat) continue
      const amt = Number(exp.amount)
      
      if (cat.type === 'needs') needs_spent += amt
      else if (cat.type === 'wants') wants_spent += amt
      else if (cat.type === 'savings') savings_spent += amt
      
      flatExpenses.push({
        id: exp.description || cat.name,
        name: exp.description || cat.name,
        category: cat.name,
        type: cat.type,
        amount: amt,
        date: exp.expense_date
      })
    }

    summary = {
      total_income: Number(allocation.net_salary),
      needs_budget: Number(allocation.needs_amount),
      needs_spent,
      wants_budget: Number(allocation.wants_amount),
      wants_spent,
      savings_budget: Number(allocation.savings_amount),
      savings_spent,
      topExpenses: flatExpenses.sort((a, b) => b.amount - a.amount).slice(0, 5),
    }
  }

  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`
  const percent = (spent: number, budget: number) => (budget > 0 ? (spent / budget) * 100 : 0)
  const remaining = summary ? summary.total_income - (summary.needs_spent + summary.wants_spent + summary.savings_spent) : 0
  const totalSpentPct = summary ? Math.round(((summary.needs_spent + summary.wants_spent + summary.savings_spent) / summary.total_income) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Month Selector */}
      {allAllocations && allAllocations.length > 0 && (
        <div className="flex justify-end mb-4">
          <form className="flex items-center gap-2" method="GET">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Viewing Month:</label>
            <select 
              name="month"
              defaultValue={selectedMonth || ''}
              className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {allAllocations.map((alloc: any) => (
                <option key={alloc.month} value={alloc.month}>
                  {new Date(alloc.month).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </option>
              ))}
            </select>
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Go</button>
          </form>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="relative">
          <p className="text-white/80 text-sm mb-1">Welcome back 👋</p>
          <h1 className="text-3xl font-bold">{String(profile?.full_name || 'User')}</h1>
          <p className="text-white/70 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      {!allocation ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-3xl p-10 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No salary entered for this month</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">Enter your salary to let MoneyMap suggest the best split based on your profile.</p>
          <Link href="/salary" className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium">
            Enter Salary →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
              <p className="text-white/80 text-sm mb-1">Net Salary</p>
              <p className="text-3xl font-bold">{formatPKR(summary!.total_income)}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
              <p className="text-white/80 text-sm mb-1">Total Spent</p>
              <p className="text-3xl font-bold">{formatPKR(summary!.needs_spent + summary!.wants_spent + summary!.savings_spent)}</p>
              <p className="text-xs text-white/70 mt-2">{totalSpentPct}% of salary used</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white shadow-lg">
              <p className="text-white/80 text-sm mb-1">Available</p>
              <p className="text-3xl font-bold">{formatPKR(remaining)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Needs', spent: summary!.needs_spent, budget: summary!.needs_budget, color: 'blue', icon: '🏠' },
              { label: 'Wants', spent: summary!.wants_spent, budget: summary!.wants_budget, color: 'amber', icon: '🎉' },
              { label: 'Savings', spent: summary!.savings_spent, budget: summary!.savings_budget, color: 'emerald', icon: '💰' },
            ].map((item) => {
              const isOver = item.spent > item.budget;
              const pct = percent(item.spent, item.budget);
              return (
                <div key={item.label} className={`relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border ${isOver ? 'border-red-500 dark:border-red-500/50 shadow-red-100 dark:shadow-none' : 'border-gray-200 dark:border-gray-800'} p-6 shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${isOver ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-800'} flex items-center justify-center text-2xl`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {item.label}
                          {isOver && <span className="text-[10px] uppercase bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">Over</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-3 overflow-hidden">
                    <div className={`h-2.5 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={`${isOver ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{formatPKR(item.spent)}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(item.budget)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {summary!.topExpenses && summary!.topExpenses.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <h3 className="font-bold text-gray-900 dark:text-white">Top 5 Expenses</h3>
                </div>
                <Link href="/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  View Full Report →
                </Link>
              </div>
              <div className="space-y-2">
                {summary!.topExpenses.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                        item.type === 'needs' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        item.type === 'wants' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}>
                        {item.category}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* GOALS PREVIEW SECTION */}
      {goals && goals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="font-bold text-gray-900 dark:text-white">My Saving Goals</h3>
            </div>
            <Link href="/goals" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal: any) => {
              const progress = Math.min(100, (Number(goal.saved_amount) / Number(goal.target_amount)) * 100);
              const isCompleted = progress >= 100;
              return (
                <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-gray-900 dark:text-white">{goal.name}</p>
                    <span className={`text-sm font-bold ${isCompleted ? 'text-emerald-500' : 'text-blue-500'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatPKR(Number(goal.saved_amount))}</span>
                    <span>{formatPKR(Number(goal.target_amount))}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/questionnaire" className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">👤</div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Edit Profile</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Update your details</p>
          </div>
        </Link>
        <Link href="/salary" className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-green-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💵</div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Manage Salary</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Edit this month's split</p>
          </div>
        </Link>
        <Link href="/expenses" className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-purple-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">➕</div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Add Expense</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Track your spending</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
