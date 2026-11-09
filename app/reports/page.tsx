'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip
} from 'recharts'

export default function ReportsPage() {
  const supabase = createClient()
  const [selectedMonth, setSelectedMonth] = useState('')
  const [availableMonths, setAvailableMonths] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!selectedMonth) return

    const fetchReportData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: allocation } = await supabase
        .from('salary_allocations')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .maybeSingle()

      if (allocation) {
        const { data: exps } = await supabase
          .from('expenses')
          .select('*, categories(name, type)')
          .eq('allocation_id', allocation.id)
          .order('expense_date', { ascending: true })
          
        const expsData = exps || []
        setExpenses(expsData)

        let needs = 0, wants = 0, savings = 0
        const catTotals: Record<string, { name: string, type: string, amount: number }> = {}

        expsData.forEach(exp => {
          const type = exp.categories?.type
          const catName = exp.categories?.name || 'Unknown'
          const amt = Number(exp.amount)

          // Overall Totals
          if (type === 'needs') needs += amt
          else if (type === 'wants') wants += amt
          else if (type === 'savings') savings += amt

          // Category Totals
          if (!catTotals[catName]) {
            catTotals[catName] = { name: catName, type: type || 'unknown', amount: 0 }
          }
          catTotals[catName].amount += amt
        })

        // Prepare bar chart data (sorted highest to lowest)
        const barData = Object.values(catTotals).sort((a, b) => b.amount - a.amount)

        setCategoryData(barData)
        setSummary({
          allocation,
          needs,
          wants,
          savings,
          total: needs + wants + savings
        })
      } else {
        setExpenses([])
        setCategoryData([])
        setSummary(null)
      }
      setLoading(false)
    }
    fetchReportData()
  }, [selectedMonth, supabase])

  const formatPKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`

  const downloadPDF = () => {
    if (!summary || !summary.allocation) return

    const doc = new jsPDF()
    const monthName = new Date(selectedMonth).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' })

    doc.setFontSize(22)
    doc.setTextColor(41, 128, 185)
    doc.text('MoneyMap Report', 14, 20)
    
    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(`Financial Summary - ${monthName}`, 14, 28)

    doc.setTextColor(0)
    doc.setFontSize(10)
    doc.text(`Net Salary: ${formatPKR(summary.allocation.net_salary)}`, 14, 40)
    doc.text(`Total Expenses: ${formatPKR(summary.total)}`, 14, 46)

    const tableData = expenses.map(exp => [
      new Date(exp.expense_date).toLocaleDateString('en-GB'),
      exp.categories?.type?.toUpperCase() || '-',
      exp.categories?.name || '-',
      exp.description || '-',
      formatPKR(exp.amount)
    ])

    autoTable(doc, {
      head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
      body: tableData,
      startY: 55,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    })

    doc.save(`MoneyMap_Report_${monthName.replace(' ', '_')}.pdf`)
  }

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981']

  const pieData = summary ? [
    { name: 'Needs', value: summary.needs },
    { name: 'Wants', value: summary.wants },
    { name: 'Savings', value: summary.savings },
  ].filter(d => d.value > 0) : []

  if (availableMonths.length === 0 && !loading) {
    return <div className="text-center py-20 text-gray-500">No salary data found.</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View your monthly expense breakdown.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            {availableMonths.map((alloc) => (
              <option key={alloc.month} value={alloc.month}>
                {new Date(alloc.month).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </option>
            ))}
          </select>

          <button 
            onClick={downloadPDF}
            disabled={!summary || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span>⬇️</span> Download PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading report data...</div>
      ) : !summary ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-500">Koi data nahi mila is mahine ke liye.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Row: Pie Chart and Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Budget Breakdown</h2>
              <div className="h-64">
                {pieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-gray-500 text-sm">No expenses yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => formatPKR(Number(value) || 0)} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Needs Spent</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{formatPKR(summary.needs)}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-800">
                <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">Wants Spent</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">{formatPKR(summary.wants)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Savings Spent</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{formatPKR(summary.savings)}</p>
              </div>
            </div>
          </div>

          {/* Middle Row: Category Bar Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Spending by Category</h2>
            <div className="h-72">
              {categoryData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">No category data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `PKR ${val/1000}k`} />
                    <BarTooltip 
                      formatter={(value: any) => [formatPKR(Number(value) || 0), 'Spent']}
                      cursor={{fill: 'transparent'}}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.type === 'needs' ? '#3b82f6' : entry.type === 'wants' ? '#f59e0b' : '#10b981'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Legend for Bar Chart */}
            <div className="flex justify-center gap-6 mt-4 text-sm font-medium">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Needs</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Wants</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Savings</div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
