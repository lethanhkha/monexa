import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import styles from './ReportsPage.module.css'

export function ReportsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Báo cáo</h1>
      </div>

      <div className={styles.grid}>
        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>Chi tiêu theo danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.pieChart}>
              <div className={styles.piePlaceholder}>
                <svg viewBox="0 0 32 32" className={styles.pieSvg}>
                  <circle r="16" cx="16" cy="16" fill="none" stroke="#10B981" strokeWidth="32" strokeDasharray="25 100" transform="rotate(-90 16 16)" />
                  <circle r="16" cx="16" cy="16" fill="none" stroke="#38BDF8" strokeWidth="32" strokeDasharray="20 100" strokeDashoffset="-25" transform="rotate(-90 16 16)" />
                  <circle r="16" cx="16" cy="16" fill="none" stroke="#A855F7" strokeWidth="32" strokeDasharray="15 100" strokeDashoffset="-45" transform="rotate(-90 16 16)" />
                  <circle r="16" cx="16" cy="16" fill="none" stroke="#F59E0B" strokeWidth="32" strokeDasharray="10 100" strokeDashoffset="-60" transform="rotate(-90 16 16)" />
                  <circle r="16" cx="16" cy="16" fill="none" stroke="#EF4444" strokeWidth="32" strokeDasharray="30 100" strokeDashoffset="-70" transform="rotate(-90 16 16)" />
                </svg>
                <div className={styles.pieCenter}>
                  <p className={styles.pieTotal}>12.25M</p>
                  <p className={styles.pieLabel}>Tổng chi</p>
                </div>
              </div>
              <div className={styles.legend}>
                {[
                  { label: 'Ăn uống', color: '#10B981', pct: '25%' },
                  { label: 'Di chuyển', color: '#38BDF8', pct: '20%' },
                  { label: 'Giải trí', color: '#A855F7', pct: '15%' },
                  { label: 'Mua sắm', color: '#F59E0B', pct: '10%' },
                  { label: 'Khác', color: '#EF4444', pct: '30%' },
                ].map(item => (
                  <div key={item.label} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: item.color }} />
                    <span className={styles.legendLabel}>{item.label}</span>
                    <span className={styles.legendPct}>{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>Thu chi theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.barChart}>
              {[
                { month: 'T1', income: 28, expense: 10 },
                { month: 'T2', income: 28, expense: 12 },
                { month: 'T3', income: 28, expense: 11 },
                { month: 'T4', income: 28, expense: 13 },
                { month: 'T5', income: 28, expense: 9 },
                { month: 'T6', income: 28, expense: 12 },
              ].map(({ month, income, expense }) => (
                <div key={month} className={styles.barGroup}>
                  <div className={styles.bars}>
                    <div className={styles.barIncome} style={{ height: `${income}%` }} />
                    <div className={styles.barExpense} style={{ height: `${expense}%` }} />
                  </div>
                  <span className={styles.barLabel}>{month}</span>
                </div>
              ))}
            </div>
            <div className={styles.barLegend}>
              <span><span className={styles.legendDot} style={{ background: 'var(--success)' }} /> Thu</span>
              <span><span className={styles.legendDot} style={{ background: 'var(--error)' }} /> Chi</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
