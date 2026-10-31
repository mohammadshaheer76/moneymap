'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('purchase_date', { ascending: false })
    
    if (data) setItems(data)
    setLoading(false)
  }

  const totalValue = items.reduce((sum, item) => sum + Number(item.purchase_price), 0)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-900 dark:text-white">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Inventory</h1>
          <p className="text-gray-600 dark:text-gray-400">Track the things you own and their value.</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl text-right">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Item Value</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">PKR {totalValue.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-3xl">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-gray-500">Your inventory is empty. Add items from the Expenses page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{item.item_name}</p>
                <p className="text-sm text-gray-500">{item.category} • {new Date(item.purchase_date).toLocaleDateString()}</p>
              </div>
              <p className="font-bold text-emerald-600 dark:text-emerald-400">PKR {Number(item.purchase_price).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
