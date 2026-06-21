import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Wallet } from '@/types'

export interface UseWalletsResult {
  wallets: Wallet[]
  loading: boolean
  error: string | null
  addWallet: (wallet: Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateWallet: (id: string, updates: Partial<Omit<Wallet, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  deleteWallet: (id: string) => Promise<void>
  refetch: () => void
}

export function useWallets(userId: string | undefined): UseWalletsResult {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWallets = useCallback(async () => {
    if (!userId) {
      setWallets([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setWallets(data ?? [])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

  const addWallet = useCallback(async (wallet: Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('wallets')
      .insert({ ...wallet, user_id: userId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (data) setWallets(prev => [...prev, data])
  }, [userId])

  const updateWallet = useCallback(async (id: string, updates: Partial<Omit<Wallet, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('wallets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (data) setWallets(prev => prev.map(w => w.id === id ? data : w))
  }, [])

  const deleteWallet = useCallback(async (id: string) => {
    const { error } = await supabase.from('wallets').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setWallets(prev => prev.filter(w => w.id !== id))
  }, [])

  return { wallets, loading, error, addWallet, updateWallet, deleteWallet, refetch: fetchWallets }
}
