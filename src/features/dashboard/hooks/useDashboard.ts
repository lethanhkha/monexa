import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { endOfMonth, format } from 'date-fns'
import type { DashboardSummary } from '@/types'

export interface UseDashboardResult {
  summary: DashboardSummary | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard(userId: string | undefined): UseDashboardResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!userId) {
      setSummary(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch wallets and monthly transactions in parallel
      const [walletsRes, txRes] = await Promise.all([
        supabase.from('wallets').select('balance, currency').eq('user_id', userId),
        supabase
          .from('transactions')
          .select('*, wallets(name)')
          .eq('user_id', userId)
          .gte('date', format(new Date(), 'yyyy-MM-01'))
          .lte('date', format(endOfMonth(new Date()), 'yyyy-MM-dd'))
          .order('date', { ascending: false })
          .limit(10),
      ])

      if (walletsRes.error) throw new Error(walletsRes.error.message)
      if (txRes.error) throw new Error(txRes.error.message)

      const wallets = walletsRes.data ?? []
      const transactions = txRes.data ?? []

      // Calculate totals
      const totalBalance = wallets
        .filter(w => w.currency === 'VND')
        .reduce((sum, w) => sum + Number(w.balance), 0)

      const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const monthlyExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      // Get budget spending per category for current month
      const { data: budgets } = await supabase
        .from('budgets')
        .select('category, amount')
        .eq('user_id', userId)

      const budgetCategories = (budgets ?? []).map(b => b.category)
      const spendingByCategory: Record<string, number> = {}
      for (const tx of transactions.filter(t => t.type === 'expense')) {
        spendingByCategory[tx.category] = (spendingByCategory[tx.category] ?? 0) + Number(tx.amount)
      }

      const budgetSummary = budgetCategories.map(cat => ({
        category: cat,
        spent: spendingByCategory[cat] ?? 0,
        limit: (budgets ?? []).find(b => b.category === cat)?.amount ?? 0,
      }))

      setSummary({
        totalBalance,
        monthlyIncome,
        monthlyExpense,
        recentTransactions: transactions.slice(0, 5),
        budgets: budgetSummary,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { summary, loading, error, refetch: fetch }
}
