import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Latest salary allocation fetch karo
  const { data: allocation } = await supabase
    .from('salary_allocations')
    .select('id, month, net_salary, needs_amount, wants_amount, savings_amount')
    .eq('user_id', user.id)
    .order('month', { ascending: false })
    .limit(1)
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

  // Data calculation
  let needs_spent = 0, wants_spent = 0, savings_spent = 0
  
  // Grouping: Type -> Category -> Items
  const groupedData: Record<string, Record<string, { total: number, items: any[] }>> = {
    needs: {},
    wants: {},
    savings: {}
  }

  for (const exp of expenses || []) {
    const cat = exp.categories as any
    if (!cat) continue
    const amt = Number(exp.amount)
    const type = cat.type as 'needs' | 'wants' | 'savings'

    if (type === 'needs') needs_spent += amt
    else if (type === 'wants') wants_spent += amt
    else if (type === 'savings') savings_spent += amt

    if (!groupedData[type][cat.name]) {
      groupedData[type][cat.name] = { total: 0, items: [] }
    }
    groupedData[type][cat.name].total += amt
    groupedData[type][cat.name].items.push({
      desc: exp.description || 'No description',
      amount: amt,
      date: exp.expense_date
    })
  }

  const totalSpent = needs_spent + wants_spent + savings_spent
  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`

  // Helper function to generate conic-gradient string
  const generateConicGradient = (data: Record<string, { total: number }>, colors: string[]) => {
    let currentPct = 0
    const stops: string[] = []
    
    Object.values(data).sort((a, b) => b.total - a.total).forEach((item, i) => {
      const pct = (item.total / Object.values(data).reduce((sum, d) => sum + d.total, 0)) * 100
      const color = colors[i % colors.length]
      stops.push(`${color} ${currentPct}% ${currentPct + pct}%`)
      currentPct += pct
    })
    
    return `conic-gradient(${stops.join(', ')})`
  }

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e']

  // Main Overall Chart
  const mainNeedsPct = totalSpent > 0 ? (needs_spent / totalSpent) * 100 : 0
  const mainWantsPct = totalSpent > 0 ? (wants_spent / totalSpent) * 100 : 0
  const mainSavingsPct = totalSpent > 0 ? (savings_spent / totalSpent) * 100 : 0

  const mainChartStyle = {
    background: `conic-gradient(
      #3b82f6 0% ${mainNeedsPct}%, 
      #f59e0b ${mainNeedsPct}% ${mainNeedsPct + mainWantsPct}%, 
      #10b981 ${mainNeedsPct + mainWantsPct}% 100%
    )`
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 text-gray-900 dark:text-white space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Detailed Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Full breakdown of your spending for {new Date(allocation.month).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}.</p>
      </div>

      {/* Main Overall Breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-8">Overall Breakdown</h2>
        {totalSpent === 0 ? (
          <p className="text-gray-500">No expenses to show.</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-56 h-56 rounded-full flex items-center justify-center shadow-inner shrink-0" style={mainChartStyle}>
              <div className="w-40 h-40 bg-white dark:bg-gray-900 rounded-full flex flex-col items-center justify-center shadow-lg">
                <span className="text-sm text-gray-500 mb-1">Total Spent</span>
                <span className="font-bold text-xl">{formatPKR(totalSpent)}</span>
              </div>
            </div>
            
            <div className="space-y-4 flex-1 w-full">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-lg font-medium">Needs</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">{Math.round(mainNeedsPct)}%</span>
                  <p className="text-sm text-gray-500">{formatPKR(needs_spent)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="text-lg font-medium">Wants</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">{Math.round(mainWantsPct)}%</span>
                  <p className="text-sm text-gray-500">{formatPKR(wants_spent)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                  <span className="text-lg font-medium">Savings</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">{Math.round(mainSavingsPct)}%</span>
                  <p className="text-sm text-gray-500">{formatPKR(savings_spent)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category-Wise Breakdowns */}
      {totalSpent > 0 && (
        <div className="space-y-12">
          <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-4">Category Breakdown</h2>

          {(['needs', 'wants', 'savings'] as const).map((type) => {
            const typeData = groupedData[type]
            const typeTotal = Object.values(typeData).reduce((sum, cat) => sum + cat.total, 0)
            if (typeTotal === 0) return null

            return (
              <div key={type} className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold capitalize">{type} Spending</h3>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium">{formatPKR(typeTotal)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Sub Pie Chart */}
                  <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col items-center">
                     <div className="relative w-40 h-40 rounded-full flex items-center justify-center mb-6" style={{ background: generateConicGradient(typeData, COLORS) }}>
                        <div className="w-28 h-28 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-md">
                          <span className="font-bold text-lg">{typeTotal > 0 ? '100%' : '0%'}</span>
                        </div>
                     </div>
                     {/* Legend */}
                     <div className="w-full space-y-2">
                        {Object.entries(typeData).sort((a, b) => b[1].total - a[1].total).map(([catName, data], idx) => (
                          <div key={catName} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                              <span className="font-medium">{catName}</span>
                            </div>
                            <span className="font-bold">{Math.round((data.total / typeTotal) * 100)}%</span>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* List of Items */}
                  <div className="md:col-span-2 space-y-4">
                    {Object.entries(typeData).sort((a, b) => b[1].total - a[1].total).map(([catName, data]) => (
                      <div key={catName} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                          <h4 className="font-bold text-gray-900 dark:text-white">{catName}</h4>
                          <span className="font-bold text-gray-900 dark:text-white">{formatPKR(data.total)}</span>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {data.items.sort((a,b) => b.amount - a.amount).map((item, idx) => (
                            <div key={idx} className="p-4 flex justify-between items-center text-sm">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{item.desc}</p>
                                <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                              </div>
                              <p className="font-semibold text-gray-900 dark:text-white">{formatPKR(item.amount)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
