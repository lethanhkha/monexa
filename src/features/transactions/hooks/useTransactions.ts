import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types'

export interface UseTransactionsResult {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  addTransaction: (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  refetch: () => void
}

export function useTransactions(userId: string | undefined): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, wallets(name)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setTransactions(data ?? [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...tx, user_id: userId })
      .select('*, wallets(name)')
      .single()

    if (error) throw new Error(error.message)
    if (data) setTransactions(prev => [data, ...prev])
  }, [userId])

  const updateTransaction = useCallback(async (id: string, updates: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, wallets(name)')
      .single()

    if (error) throw new Error(error.message)
    if (data) setTransactions(prev => prev.map(t => t.id === id ? data : t))
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  return { transactions, loading, error, addTransaction, updateTransaction, deleteTransaction, refetch: fetchTransactions }
}
