import { Card, Button, Badge } from '@/components/ui'
import { Plus, TrendingUp, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from './SavingsPage.module.css'

const mockGoals = [
  { id: '1', name: 'Du lịch Nhật Bản', target: 50_000_000, current: 32_500_000, deadline: '2026-12-31', color: '#38BDF8' },
  { id: '2', name: 'Mua xe máy', target: 35_000_000, current: 8_000_000, deadline: '2027-06-01', color: '#A855F7' },
  { id: '3', name: 'Quỹ khẩn cấp', target: 20_000_000, current: 20_000_000, deadline: '2026-09-01', color: '#10B981' },
]

export function SavingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Mục tiêu tiết kiệm</h1>
        <Button><Plus size={16} /> Thêm mục tiêu</Button>
      </div>

      <div className={styles.grid}>
        {mockGoals.map(goal => {
          const pct = Math.round((goal.current / goal.target) * 100)
          const completed = pct >= 100
          const daysLeft = goal.deadline
            ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null
          return (
            <Card key={goal.id} className={styles.goalCard}>
              <div className={styles.goalHeader}>
                <div className={styles.goalIcon} style={{ background: `${goal.color}20` }}>
                  <TrendingUp size={20} color={goal.color} />
                </div>
                {completed && <Badge variant="success">Hoàn thành!</Badge>}
              </div>
              <h3 className={styles.goalName}>{goal.name}</h3>
              <div className={styles.amounts}>
                <span className={styles.current} style={{ color: goal.color }}>
                  {formatCurrency(goal.current)}
                </span>
                <span className={styles.target}> / {formatCurrency(goal.target)}</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${pct}%`, background: goal.color }}
                />
              </div>
              <div className={styles.footer}>
                <span className={styles.pct}>{pct}%</span>
                {daysLeft !== null && (
                  <span className={styles.daysLeft}>
                    <Calendar size={12} /> {completed ? 'Đã hoàn thành' : `${daysLeft} ngày còn lại`}
                  </span>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
