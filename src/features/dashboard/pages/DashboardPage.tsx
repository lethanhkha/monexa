import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge as BadgeUI } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
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
    { id: '5', type: 'expense', amount: 150_000, category: 'Giải trí', note: 'Netflix tháng 6', date: new Date(Date.now() - 345600000).toISOString() },
  ],
  budgets: [
    { category: 'Ăn uống', spent: 2_100_000, limit: 3_000_000 },
    { category: 'Di chuyển', spent: 850_000, limit: 1_000_000 },
    { category: 'Giải trí', spent: 600_000, limit: 500_000 },
  ],
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Chào buổi sáng', emoji: '☀️' }
  if (hour < 18) return { text: 'Chào buổi chiều', emoji: '🌤️' }
  return { text: 'Chào buổi tối', emoji: '🌙' }
}

function getBudgetStatus(spent: number, limit: number) {
  const pct = (spent / limit) * 100
  if (pct > 100) return 'over'
  if (pct >= 80) return 'warning'
  return 'ok'
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const greeting = getGreeting()
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const savings = mockData.monthlyIncome - mockData.monthlyExpense

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in-up`}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            {greeting.emoji} {greeting.text}
          </h1>
          <p className={styles.dateLabel}>{today}</p>
        </div>
        <div className={styles.aiChip}>
          <Sparkles size={14} />
          <span>AI insights sắp ra mắt</span>
        </div>
      </div>

      {/* Balance Cards */}
      {loading ? (
        <div className={`${styles.balanceGrid} ${styles.balanceGridSkel}`}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.skeletonCard}>
              <div className={`skeleton ${styles.skelLine}`} style={{ width: '60%', height: 14 }} />
              <div className={`skeleton ${styles.skelLine}`} style={{ width: '80%', height: 36, marginTop: 12 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className={`${styles.balanceGrid} stagger-children`}>
          {/* Total Balance */}
          <Card className={`${styles.balanceCard} ${styles.balanceCardPrimary}`}>
            <CardHeader className={styles.cardHeaderSm}>
              <CardTitle className={styles.cardTitleSm}>
                <Wallet size={15} />
                Tổng số dư
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.cardContentSm}>
              <p className={styles.balanceAmount}>
                {formatCurrency(mockData.totalBalance)}
              </p>
              <div className={styles.cardTrend}>
                <TrendingUp size={13} />
                <span>+2.5% so với tháng trước</span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Income */}
          <Card className={`${styles.balanceCard} ${styles.balanceCardIncome}`}>
            <CardHeader className={styles.cardHeaderSm}>
              <CardTitle className={styles.cardTitleSm}>
                <TrendingUp size={15} style={{ color: 'var(--success)' }} />
                Thu nhập tháng
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.cardContentSm}>
              <p className={`${styles.moneyAmount} ${styles.moneyIncome}`}>
                +{formatCurrency(mockData.monthlyIncome)}
              </p>
              <div className={styles.cardMeta}>Tháng 6/2026</div>
            </CardContent>
          </Card>

          {/* Monthly Expense */}
          <Card className={`${styles.balanceCard} ${styles.balanceCardExpense}`}>
            <CardHeader className={styles.cardHeaderSm}>
              <CardTitle className={styles.cardTitleSm}>
                <TrendingDown size={15} style={{ color: 'var(--error)' }} />
                Chi tiêu tháng
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.cardContentSm}>
              <p className={`${styles.moneyAmount} ${styles.moneyExpense}`}>
                -{formatCurrency(mockData.monthlyExpense)}
              </p>
              <div className={styles.cardMeta}>
                Tiết kiệm <strong style={{ color: 'var(--success)' }}>{formatCurrency(savings)}</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Grid */}
      <div className={`${styles.contentGrid} ${loading ? '' : 'animate-fade-in-up'}`} style={{ animationDelay: '200ms' }}>
        {/* Recent Transactions */}
        <Card className={styles.transactionsCard}>
          <CardHeader className={styles.cardHeaderRow}>
            <CardTitle>Giao dịch gần đây</CardTitle>
            <a href="/transactions" className={styles.viewAllLink}>
              Xem tất cả <ArrowRight size={14} />
            </a>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className={styles.txSkeleton}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={styles.txItemSkeleton}>
                    <div className={`skeleton ${styles.skelCircle}`} />
                    <div style={{ flex: 1 }}>
                      <div className={`skeleton skeleton-text`} style={{ width: '50%' }} />
                      <div className={`skeleton skeleton-text`} style={{ width: '75%', height: 11 }} />
                    </div>
                    <div className={`skeleton`} style={{ width: 80, height: 16, borderRadius: 6 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.transactionList}>
                {mockData.recentTransactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className={`${styles.transactionItem} animate-fade-in`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className={styles.txLeft}>
                      <span className={`${styles.txDot} ${tx.type === 'income' ? styles.dotIncome : styles.dotExpense}`} />
                      <div className={styles.txMeta}>
                        <p className={styles.txCategory}>{tx.category}</p>
                        <p className={styles.txNote}>{tx.note}</p>
                      </div>
                    </div>
                    <div className={styles.txRight}>
                      <p className={`${styles.txAmount} ${tx.type === 'income' ? styles.amountIncome : styles.amountExpense}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className={styles.txDate}>
                        {new Date(tx.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card className={styles.budgetsCard}>
          <CardHeader className={styles.cardHeaderRow}>
            <CardTitle>Ngân sách tháng</CardTitle>
            <a href="/budgets" className={styles.viewAllLink}>
              Chi tiết <ArrowRight size={14} />
            </a>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className={styles.budgetSkeleton}>
                {[1, 2, 3].map(i => (
                  <div key={i} className={styles.budgetItemSkeleton}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div className={`skeleton`} style={{ width: 80, height: 14 }} />
                      <div className={`skeleton`} style={{ width: 50, height: 14 }} />
                    </div>
                    <div className={`skeleton`} style={{ width: '100%', height: 8, borderRadius: 99 }} />
                    <div className={`skeleton`} style={{ width: '60%', height: 11, marginTop: 6 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.budgetList}>
                {mockData.budgets.map((b, i) => {
                  const pct = Math.min(100, Math.round((b.spent / b.limit) * 100))
                  const status = getBudgetStatus(b.spent, b.limit)
                  return (
                    <div
                      key={i}
                      className={`${styles.budgetItem} animate-fade-in`}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className={styles.budgetHeader}>
                        <span className={styles.budgetCategory}>{b.category}</span>
                        <BadgeUI variant={
                          status === 'over' ? 'error' :
                          status === 'warning' ? 'warning' : 'success'
                        }>
                          {status === 'over' && <AlertCircle size={10} />}
                          {status === 'over' ? 'Vượt' :
                           status === 'warning' ? 'Cảnh báo' : 'Tốt'}
                        </BadgeUI>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={`${styles.progressBar} ${
                            status === 'over' ? styles.progressOver :
                            status === 'warning' ? styles.progressWarn : styles.progressOk
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <div className={styles.budgetAmounts}>
                        <span>{formatCurrency(b.spent)} đã chi</span>
                        <span className={status === 'over' ? styles.overText : styles.okText}>
                          {formatCurrency(Math.abs(b.limit - b.spent))} {status === 'over' ? 'vượt' : 'còn'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
