import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react'
import styles from './DashboardPage.module.css'

// Mock data — will be replaced with Supabase queries
const mockData = {
  totalBalance: 15_750_000,
  monthlyIncome: 28_000_000,
  monthlyExpense: 12_250_000,
  recentTransactions: [
    { id: '1', type: 'expense', amount: 85000, category: 'Ăn uống', note: 'Cơm trưa công ty', date: new Date().toISOString() },
    { id: '2', type: 'income', amount: 28_000_000, category: 'Lương', note: 'Lương tháng 6', date: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', type: 'expense', amount: 450_000, category: 'Di chuyển', note: 'Grab đi làm', date: new Date(Date.now() - 172800000).toISOString() },
    { id: '4', type: 'expense', amount: 320_000, category: 'Mua sắm', note: 'Tạp hóa', date: new Date(Date.now() - 259200000).toISOString() },
  ],
  budgets: [
    { category: 'Ăn uống', spent: 2_100_000, limit: 3_000_000 },
    { category: 'Di chuyển', spent: 850_000, limit: 1_000_000 },
    { category: 'Giải trí', spent: 600_000, limit: 500_000 },
  ],
}

export function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Tổng quan</h1>
          <p className={styles.greeting}>Chào buổi sáng — mọi thứ đang ổn!</p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className={styles.balanceGrid}>
        <Card className={styles.balanceCard}>
          <CardHeader>
            <CardTitle>
              <Wallet size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Tổng số dư
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.balanceAmount}>{formatCurrency(mockData.totalBalance)}</p>
          </CardContent>
        </Card>

        <Card className={styles.incomeCard}>
          <CardHeader>
            <CardTitle>
              <TrendingUp size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--success)' }} />
              Thu nhập tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.incomeAmount}>{formatCurrency(mockData.monthlyIncome)}</p>
          </CardContent>
        </Card>

        <Card className={styles.expenseCard}>
          <CardHeader>
            <CardTitle>
              <TrendingDown size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--error)' }} />
              Chi tiêu tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.expenseAmount}>{formatCurrency(mockData.monthlyExpense)}</p>
          </CardContent>
        </Card>
      </div>

      <div className={styles.contentGrid}>
        {/* Recent Transactions */}
        <Card className={styles.transactionsCard}>
          <CardHeader>
            <CardTitle>Giao dịch gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.transactionList}>
              {mockData.recentTransactions.map(tx => (
                <div key={tx.id} className={styles.transactionItem}>
                  <div className={styles.txLeft}>
                    <span className={`${styles.txDot} ${tx.type === 'income' ? styles.dotIncome : styles.dotExpense}`} />
                    <div>
                      <p className={styles.txCategory}>{tx.category}</p>
                      <p className={styles.txNote}>{tx.note}</p>
                    </div>
                  </div>
                  <p className={`${styles.txAmount} ${tx.type === 'income' ? styles.amountIncome : styles.amountExpense}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card className={styles.budgetsCard}>
          <CardHeader>
            <CardTitle>Ngân sách tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.budgetList}>
              {mockData.budgets.map((b, i) => {
                const pct = Math.min(100, Math.round((b.spent / b.limit) * 100))
                const overBudget = pct > 100
                return (
                  <div key={i} className={styles.budgetItem}>
                    <div className={styles.budgetHeader}>
                      <span className={styles.budgetCategory}>{b.category}</span>
                      {overBudget && <Badge variant="error"><AlertCircle size={10} /> Vượt</Badge>}
                      {!overBudget && pct >= 80 && <Badge variant="warning">Cảnh báo</Badge>}
                      {!overBudget && pct < 80 && <Badge variant="success">Tốt</Badge>}
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={`${styles.progressBar} ${overBudget ? styles.progressOver : pct >= 80 ? styles.progressWarn : styles.progressOk}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className={styles.budgetAmounts}>
                      {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
