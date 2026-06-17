import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui'
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import styles from './BudgetsPage.module.css'

const mockBudgets = [
  { category: 'Ăn uống', spent: 2_100_000, limit: 3_000_000, color: '#10B981' },
  { category: 'Di chuyển', spent: 850_000, limit: 1_000_000, color: '#38BDF8' },
  { category: 'Giải trí', spent: 600_000, limit: 500_000, color: '#A855F7' },
  { category: 'Mua sắm', spent: 400_000, limit: 2_000_000, color: '#F59E0B' },
  { category: 'Sức khỏe', spent: 150_000, limit: 500_000, color: '#EF4444' },
]

export function BudgetsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Ngân sách</h1>
          <p className={styles.subtitle}>Tháng 6/2026</p>
        </div>
        <Button><Plus size={16} /> Thêm ngân sách</Button>
      </div>

      <div className={styles.grid}>
        {mockBudgets.map((b, i) => {
          const pct = Math.min(100, Math.round((b.spent / b.limit) * 100))
          const remaining = b.limit - b.spent
          const overBudget = remaining < 0
          return (
            <Card key={i} className={styles.budgetCard}>
              <div className={styles.cardTop}>
                <span className={styles.categoryDot} style={{ background: b.color }} />
                <h3 className={styles.categoryName}>{b.category}</h3>
                {overBudget ? (
                  <Badge variant="error"><AlertCircle size={10} /> Vượt ngân sách</Badge>
                ) : pct >= 80 ? (
                  <Badge variant="warning"><AlertCircle size={10} /> Cảnh báo</Badge>
                ) : (
                  <Badge variant="success"><CheckCircle2 size={10} /> Tốt</Badge>
                )}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${Math.min(100, pct)}%`, background: b.color }}
                />
              </div>
              <div className={styles.amounts}>
                <span className={styles.spent}>{formatCurrency(b.spent)} đã chi</span>
                <span className={styles.remaining} style={{ color: overBudget ? 'var(--error)' : 'var(--success)' }}>
                  {overBudget ? `Vượt ${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} còn lại`}
                </span>
              </div>
              <p className={styles.limit}>Hạn mức: {formatCurrency(b.limit)}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
