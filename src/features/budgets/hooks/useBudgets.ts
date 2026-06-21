import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/types'

export interface UseBudgetsResult {
  budgets: Budget[]
  loading: boolean
  error: string | null
  addBudget: (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateBudget: (id: string, updates: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  refetch: () => void
}

export function useBudgets(userId: string | undefined): UseBudgetsResult {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    if (!userId) {
      setBudgets([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setBudgets(data ?? [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const addBudget = useCallback(async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budget, user_id: userId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (data) setBudgets(prev => [...prev, data])
  }, [userId])

  const updateBudget = useCallback(async (id: string, updates: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('budgets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (data) setBudgets(prev => prev.map(b => b.id === id ? data : b))
  }, [])

  const deleteBudget = useCallback(async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setBudgets(prev => prev.filter(b => b.id !== id))
  }, [])

  return { budgets, loading, error, addBudget, updateBudget, deleteBudget, refetch: fetchBudgets }
}
