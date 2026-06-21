// =============================================
// MONEXA — TypeScript Types
// =============================================

export interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
}

export interface Wallet {
  id: string
  user_id: string
  name: string
  type: 'cash' | 'bank' | 'e-wallet'
  currency: 'VND' | 'USD'
  balance: number
  color?: string
  icon?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  wallet_id: string
  type: 'income' | 'expense'
  amount: number
  currency: 'VND' | 'USD'
  category: string
  note?: string
  date: string
  is_recurring?: boolean
  recurring_id?: string
  created_at: string
  updated_at: string
  wallets?: { name?: string }
}

export interface Category {
  id: string
  user_id?: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense'
  is_default?: boolean
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  period: 'monthly' | 'weekly'
  start_date: string
  alert_threshold: number
  created_at: string
  updated_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline?: string
  icon?: string
  color?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Dashboard summary types
export interface DashboardSummary {
  totalBalance: number
  monthlyIncome: number
  monthlyExpense: number
  recentTransactions: Transaction[]
  budgets: {
    category: string
    spent: number
    limit: number
  }[]
}
