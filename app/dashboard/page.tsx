import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, user_id, full_name, age, marital_status, living_situation, family_type, employment_type, dependents_count, has_dependents, has_other_income, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: allocation } = await supabase
    .from('salary_allocations')
    .select('id, user_id, month, net_salary, needs_percent, wants_percent, savings_percent, needs_amount, wants_amount, savings_amount, rule_id, created_at')
    .eq('user_id', user.id)
    .eq('month', currentMonth)
    .maybeSingle()

  let summary = null
  if (allocation) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category_id, description')
      .eq('allocation_id', allocation.id)

    const { data: categories } = await supabase.from('categories').select('id, name, type')
    const categoryMap = new Map((categories || []).map((c) => [c.id, c]))

    let needs_spent = 0, wants_spent = 0, savings_spent = 0
    const categoryTotals: Record<string, { name: string; type: string; total: number; items: { desc: string; amount: number }[] }> = {}

    for (const exp of expenses || []) {
      const cat = categoryMap.get(exp.category_id)
      if (!cat) continue
      const amt = Number(exp.amount)
      if (cat.type === 'needs') needs_spent += amt
      else if (cat.type === 'wants') wants_spent += amt
      else if (cat.type === 'savings') savings_spent += amt
      
      if (!categoryTotals[cat.id]) {
        categoryTotals[cat.id] = { name: cat.name, type: cat.type, total: 0, items: [] }
      }
      categoryTotals[cat.id].total += amt
      
      // Description ko save karo
      if (exp.description) {
        categoryTotals[cat.id].items.push({ desc: exp.description, amount: amt })
      }
    }

    summary = {
      total_income: Number(allocation.net_salary),
      needs_budget: Number(allocation.needs_amount),
      needs_spent,
      wants_budget: Number(allocation.wants_amount),
      wants_spent,
      savings_budget: Number(allocation.savings_amount),
      savings_spent,
      categoryTotals: Object.values(categoryTotals),
    }
  }

  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`
  const percent = (spent: number, budget: number) => (budget > 0 ? Math.min(100, (spent / budget) * 100) : 0)
  const remaining = summary ? summary.total_income - (summary.needs_spent + summary.wants_spent + summary.savings_spent) : 0
  const totalSpentPct = summary ? Math.round(((summary.needs_spent + summary.wants_spent + summary.savings_spent) / summary.total_income) * 100) : 0

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
        <div className="relative">
          <p className="text-white/80 text-sm mb-1">Welcome back 👋</p>
          <h1 className="text-3xl font-bold">
            {String(profile?.full_name || 'User')}
          </h1>
          <p className="text-white/70 text-sm mt-1">{user.email}</p>
        </div>
      </div>

      {!allocation ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-3xl p-10 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No salary entered for this month
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Enter your salary to let MoneyMap suggest the best split based on your profile.
          </p>
          <Link
            href="/salary"
            className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            Enter Salary →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
              <p className="text-white/80 text-sm mb-1">Net Salary</p>
              <p className="text-3xl font-bold">{formatPKR(summary!.total_income)}</p>
              <p className="text-xs text-white/70 mt-2">
                {new Date(allocation.month).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
              <p className="text-white/80 text-sm mb-1">Total Spent</p>
              <p className="text-3xl font-bold">
                {formatPKR(summary!.needs_spent + summary!.wants_spent + summary!.savings_spent)}
              </p>
              <p className="text-xs text-white/70 mt-2">{totalSpentPct}% of salary used</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
              <p className="text-white/80 text-sm mb-1">Available</p>
              <p className="text-3xl font-bold">{formatPKR(remaining)}</p>
              <p className="text-xs text-white/70 mt-2">Available to spend</p>
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
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={`${isOver ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatPKR(item.spent)}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(item.budget)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MONTHLY SUMMARY SECTION */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📈</span>
              <h3 className="font-bold text-gray-900 dark:text-white">Monthly Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
                <p className="font-bold text-gray-900 dark:text-white">{formatPKR(summary!.total_income)}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Spent</p>
                <p className="font-bold text-gray-900 dark:text-white">{formatPKR(summary!.needs_spent + summary!.wants_spent + summary!.savings_spent)}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Saved</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(summary!.savings_spent)}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
                <p className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {formatPKR(remaining)}
                </p>
              </div>
            </div>
          </div>

          {summary!.categoryTotals.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📂</span>
                  <h3 className="font-bold text-gray-900 dark:text-white">Category-wise Spending Report</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">See exactly where your money goes.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm">
                      <th className="p-4 font-medium">Category</th>
                      <th className="p-4 font-medium">Type</th>
                      <th className="p-4 font-medium text-right">Spent</th>
                      <th className="p-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {summary!.categoryTotals.sort((a, b) => b.total - a.total).map((cat, i) => {
                      // Calculate budget for this category type
                      let budgetForType = 0;
                      if (cat.type === 'needs') budgetForType = summary!.needs_budget;
                      else if (cat.type === 'wants') budgetForType = summary!.wants_budget;
                      else if (cat.type === 'savings') budgetForType = summary!.savings_budget;

                      // Find total spent in this type
                      let totalSpentInType = 0;
                      if (cat.type === 'needs') totalSpentInType = summary!.needs_spent;
                      else if (cat.type === 'wants') totalSpentInType = summary!.wants_spent;
                      else if (cat.type === 'savings') totalSpentInType = summary!.savings_spent;

                      const isOverBudget = totalSpentInType > budgetForType;
                      const percentUsed = budgetForType > 0 ? (totalSpentInType / budgetForType) * 100 : 0;

                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4">
                            <p className="font-medium text-gray-900 dark:text-white">{cat.name}</p>
                            {cat.items && cat.items.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {cat.items.slice(0, 3).map((item, idx) => (
                                  <p key={idx} className="text-xs text-gray-500 dark:text-gray-400">
                                    • {item.desc} (PKR {item.amount.toLocaleString()})
                                  </p>
                                ))}
                                {cat.items.length > 3 && (
                                  <p className="text-xs text-gray-400 italic">...and {cat.items.length - 3} more</p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                              cat.type === 'needs' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              cat.type === 'wants' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}>
                              {cat.type}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-gray-900 dark:text-white">
                            {formatPKR(cat.total)}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`text-sm ${isOverBudget ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                              {isOverBudget ? '⚠️ Over Budget' : `${Math.round(percentUsed)}% of ${cat.type} used`}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/questionnaire" className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            👤
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Edit Profile</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Update your details</p>
          </div>
        </Link>
        <Link href="/salary" className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-green-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            💵
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Manage Salary</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Edit this month's split</p>
          </div>
        </Link>
        <Link href="/expenses" className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-purple-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            ➕
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Add Expense</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Track your spending</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
