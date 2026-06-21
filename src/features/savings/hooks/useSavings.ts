import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SavingsGoal } from '@/types'

export interface UseSavingsResult {
  goals: SavingsGoal[]
  loading: boolean
  error: string | null
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateGoal: (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  refetch: () => void
}

export function useSavings(userId: string | undefined): UseSavingsResult {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setGoals([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setGoals(data ?? [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const addGoal = useCallback(async (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({ ...goal, user_id: userId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (data) setGoals(prev => [...prev, data])
  }, [userId])

  const updateGoal = useCallback(async (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('savings_goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (data) setGoals(prev => prev.map(g => g.id === id ? data : g))
  }, [])

  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  return { goals, loading, error, addGoal, updateGoal, deleteGoal, refetch: fetchGoals }
}
