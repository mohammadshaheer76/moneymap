import { createClient } from '@/lib/supabase/server'
import { encryptedSupabase } from '@cipherstash/stack-supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const es = await encryptedSupabase(supabase)
  const { data: profile } = await es
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .single()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: allocation } = await supabase
    .from('salary_allocations')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', currentMonth)
    .maybeSingle()

  let summary = null
  if (allocation) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category_id')
      .eq('allocation_id', allocation.id)

    const { data: categories } = await supabase.from('categories').select('id, name, type')
    const categoryMap = new Map((categories || []).map((c) => [c.id, c]))

    let needs_spent = 0, wants_spent = 0, savings_spent = 0
    const categoryTotals: Record<string, { name: string; type: string; total: number }> = {}

    for (const exp of expenses || []) {
      const cat = categoryMap.get(exp.category_id)
      if (!cat) continue
      const amt = Number(exp.amount)
      if (cat.type === 'needs') needs_spent += amt
      else if (cat.type === 'wants') wants_spent += amt
      else if (cat.type === 'savings') savings_spent += amt
      if (!categoryTotals[cat.id]) categoryTotals[cat.id] = { name: cat.name, type: cat.type, total: 0 }
      categoryTotals[cat.id].total += amt
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
      {/* Header with gradient */}
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
            Is mahine ki salary enter nahi ki
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Apni salary enter karo aur MoneyMap aapke profile ke hisaab se best split suggest karega.
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
          {/* Top Stats */}
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
              <p className="text-white/80 text-sm mb-1">Baqi</p>
              <p className="text-3xl font-bold">{formatPKR(remaining)}</p>
              <p className="text-xs text-white/70 mt-2">Available to spend</p>
            </div>
          </div>

          {/* Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Needs - Blue */}
            <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-blue-200 dark:border-blue-900/50 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center text-2xl">
                    🏠
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Needs</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Essentials</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(percent(summary!.needs_spent, summary!.needs_budget))}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-3 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                  style={{ width: `${percent(summary!.needs_spent, summary!.needs_budget)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{formatPKR(summary!.needs_spent)}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(summary!.needs_budget)}</span>
              </div>
            </div>

            {/* Wants - Amber */}
            <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/50 dark:to-orange-800/50 flex items-center justify-center text-2xl">
                    🎉
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Wants</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Lifestyle</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {Math.round(percent(summary!.wants_spent, summary!.wants_budget))}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-3 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                  style={{ width: `${percent(summary!.wants_spent, summary!.wants_budget)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{formatPKR(summary!.wants_spent)}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(summary!.wants_budget)}</span>
              </div>
            </div>

            {/* Savings - Green */}
            <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-900/50 dark:to-teal-800/50 flex items-center justify-center text-2xl">
                    💰
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Savings</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Future</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round(percent(summary!.savings_spent, summary!.savings_budget))}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-3 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${percent(summary!.savings_spent, summary!.savings_budget)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{formatPKR(summary!.savings_spent)}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(summary!.savings_budget)}</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {summary!.categoryTotals.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl">📂</span>
                <h3 className="font-bold text-gray-900 dark:text-white">Category Breakdown</h3>
              </div>
              <div className="space-y-2">
                {summary!.categoryTotals.sort((a, b) => b.total - a.total).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        cat.type === 'needs' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        cat.type === 'wants' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}>
                        {cat.type}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPKR(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/questionnaire" className="group relative overflow-hidden flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            👤
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Edit Profile</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Update your details</p>
          </div>
        </Link>
        <Link href="/salary" className="group relative overflow-hidden flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-green-500 dark:hover:border-green-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/50 dark:to-emerald-800/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            💵
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Manage Salary</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Edit this month's split</p>
          </div>
        </Link>
        <Link href="/expenses" className="group relative overflow-hidden flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:border-purple-500 dark:hover:border-purple-500 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900/50 dark:to-pink-800/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
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
