import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import styles from './ReportsPage.module.css'

const CATEGORY_DATA = [
  { label: 'Ăn uống', color: '#10B981', amount: 3_062_500, pct: 25 },
  { label: 'Di chuyển', color: '#38BDF8', amount: 2_450_000, pct: 20 },
  { label: 'Giải trí', color: '#A855F7', amount: 1_837_500, pct: 15 },
  { label: 'Mua sắm', color: '#F59E0B', amount: 1_225_000, pct: 10 },
  { label: 'Khác', color: '#EF4444', amount: 3_675_000, pct: 30 },
]

const MONTHLY_DATA = [
  { month: 'T1', label: 'Tháng 1', income: 28_000_000, expense: 10_000_000 },
  { month: 'T2', label: 'Tháng 2', income: 28_000_000, expense: 12_500_000 },
  { month: 'T3', label: 'Tháng 3', income: 30_000_000, expense: 11_000_000 },
  { month: 'T4', label: 'Tháng 4', income: 28_000_000, expense: 13_000_000 },
  { month: 'T5', label: 'Tháng 5', income: 28_000_000, expense: 9_000_000 },
  { month: 'T6', label: 'Tháng 6', income: 28_000_000, expense: 12_250_000 },
]

type PeriodKey = '6m' | '3m' | '1m'
const PERIOD_LABELS: Record<PeriodKey, string> = { '6m': '6 tháng', '3m': '3 tháng', '1m': '1 tháng' }

function buildPieSlices(data: typeof CATEGORY_DATA, radius = 60, cx = 80, cy = 80) {
  const total = data.reduce((s, d) => s + d.pct, 0)
  let start = -90
  return data.map(d => {
    const angle = (d.pct / total) * 360
    const startAngle = start
    const endAngle = start + angle
    start = endAngle
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    const largeArc = angle > 180 ? 1 : 0
    return { ...d, x1, y1, x2, y2, largeArc }
  })
}

export function ReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>('6m')
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null)

  const sliceData = buildPieSlices(CATEGORY_DATA)

  const maxMonthly = Math.max(...MONTHLY_DATA.map(d => Math.max(d.income, d.expense)))
  const chartHeight = 200

  const totalExpense = CATEGORY_DATA.reduce((s, d) => s + d.amount, 0)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in-up`}>
        <div>
          <h1 className={styles.pageTitle}>Báo cáo</h1>
          <p className={styles.headerMeta}>Phân tích chi tiêu và thu nhập</p>
        </div>
        <div className={styles.periodTabs}>
          {(['1m', '3m', '6m'] as PeriodKey[]).map(p => (
            <button
              key={p}
              className={`${styles.periodTab} ${period === p ? styles.periodTabActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className={`${styles.grid} animate-fade-in-up`} style={{ animationDelay: '80ms' }}>
        {/* ========== PIE CHART ========== */}
        <Card className={styles.chartCard}>
          <CardHeader className={styles.cardHeader}>
            <CardTitle>Chi tiêu theo danh mục</CardTitle>
            <span className={styles.chartMeta}>{PERIOD_LABELS[period]}</span>
          </CardHeader>
          <CardContent>
            <div className={styles.pieWrapper}>
              {/* SVG Donut Chart */}
              <div className={styles.pieContainer}>
                <svg viewBox="0 0 160 160" className={styles.pieSvg}>
                  {/* Background circle */}
                  <circle
                    cx="80" cy="80" r="60"
                    fill="none"
                    stroke="var(--neutral-light)"
                    strokeWidth="28"
                  />
                  {/* Donut slices */}
                  {sliceData.map((slice, i) => (
                    <path
                      key={slice.label}
                      d={`M 80 80 L ${slice.x1} ${slice.y1} A 60 60 0 ${slice.largeArc} 1 ${slice.x2} ${slice.y2} Z`}
                      fill={slice.color}
                      stroke="white"
                      strokeWidth="2"
                      className={`${styles.pieSlice} ${hoveredSlice === slice.label ? styles.pieSliceHover : ''}`}
                      style={{ '--slice-delay': `${i * 80}ms` } as React.CSSProperties}
                      onMouseEnter={() => setHoveredSlice(slice.label)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  ))}
                  {/* Center */}
                  <circle cx="80" cy="80" r="42" fill="var(--surface)" />
                  <text x="80" y="76" textAnchor="middle" className={styles.pieTotalText}>
                    {formatCurrency(totalExpense, 'VND').replace(' ₫', '')}
                  </text>
                  <text x="80" y="91" textAnchor="middle" className={styles.pieTotalLabel}>
                    Tổng chi
                  </text>
                </svg>

                {/* Hover tooltip */}
                {hoveredSlice && (() => {
                  const slice = sliceData.find(s => s.label === hoveredSlice)!
                  return (
                    <div className={`${styles.pieTooltip} animate-scale-in`}>
                      <span className={styles.tooltipDot} style={{ background: slice.color }} />
                      <span className={styles.tooltipLabel}>{slice.label}</span>
                      <span className={styles.tooltipValue}>{slice.pct}%</span>
                    </div>
                  )
                })()}
              </div>

              {/* Legend */}
              <div className={styles.legend}>
                {CATEGORY_DATA.map(item => (
                  <div
                    key={item.label}
                    className={`${styles.legendItem} ${hoveredSlice === item.label ? styles.legendItemActive : ''}`}
                    onMouseEnter={() => setHoveredSlice(item.label)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <div className={styles.legendLeft}>
                      <span className={styles.legendDot} style={{ background: item.color }} />
                      <span className={styles.legendLabel}>{item.label}</span>
                    </div>
                    <div className={styles.legendRight}>
                      <span className={styles.legendAmount}>{formatCurrency(item.amount)}</span>
                      <span className={styles.legendPct}>{item.pct}%</span>
                    </div>
                    {/* Mini bar */}
                    <div className={styles.legendBar}>
                      <div
                        className={styles.legendBarFill}
                        style={{ width: `${item.pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== BAR CHART ========== */}
        <Card className={styles.chartCard}>
          <CardHeader className={styles.cardHeader}>
            <CardTitle>Thu chi theo tháng</CardTitle>
            <div className={styles.barLegend}>
              <span className={styles.legendDot2} style={{ background: 'var(--success)' }} />
              <span className={styles.legendDotLabel}>Thu</span>
              <span className={styles.legendDot2} style={{ background: 'var(--error)' }} />
              <span className={styles.legendDotLabel}>Chi</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className={styles.barChart}>
              {MONTHLY_DATA.map(({ month, label, income, expense }) => {
                const incomeH = Math.max(4, (income / maxMonthly) * chartHeight)
                const expenseH = Math.max(4, (expense / maxMonthly) * chartHeight)
                return (
                  <div key={month} className={styles.barGroup} title={`${label}: Thu ${formatCurrency(income)}, Chi ${formatCurrency(expense)}`}>
                    <div className={styles.bars}>
                      <div
                        className={styles.barIncome}
                        style={{ height: `${incomeH}px` }}
                      />
                      <div
                        className={styles.barExpense}
                        style={{ height: `${expenseH}px` }}
                      />
                    </div>
                    <span className={styles.barLabel}>{month}</span>
                  </div>
                )
              })}
            </div>

            {/* Monthly totals */}
            <div className={styles.monthlySummary}>
              {MONTHLY_DATA.map(({ month, income, expense }) => (
                <div key={month} className={styles.monthlyItem}>
                  <span className={styles.monthlyMonth}>{month}</span>
                  <span className={styles.monthlyIncome}>{formatCurrency(income)}</span>
                  <span className={styles.monthlyExpense}>{formatCurrency(expense)}</span>
                  <span
                    className={`${styles.monthlyDiff} ${income - expense >= 0 ? styles.diffPositive : styles.diffNegative}`}
                  >
                    {income >= expense ? '+' : ''}{formatCurrency(income - expense)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== STATS GRID ========== */}
      <div className={`${styles.statsGrid} animate-fade-in-up`} style={{ animationDelay: '160ms' }}>
        {[
          { label: 'Tổng thu', value: '168.000.000', color: 'var(--success)', note: '6 tháng' },
          { label: 'Tổng chi', value: formatCurrency(67_750_000).replace(' ₫', ''), color: 'var(--error)', note: '6 tháng' },
          { label: 'Tiết kiệm TB/tháng', value: formatCurrency(16_708_333).replace(' ₫', ''), color: 'var(--primary)', note: 'Mỗi tháng' },
          { label: 'Tỷ lệ tiết kiệm', value: '59.7%', color: 'var(--secondary)', note: 'Trung bình' },
        ].map(stat => (
          <Card key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue} style={{ color: stat.color }}>{stat.value}</p>
            <p className={styles.statNote}>{stat.note}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

