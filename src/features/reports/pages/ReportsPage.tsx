import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import styles from './ReportsPage.module.css'

const CATEGORY_COLORS: Record<string, string> = {
  'Ăn uống': '#10B981', 'Di chuyển': '#38BDF8', 'Mua sắm': '#F59E0B',
  'Giải trí': '#A855F7', 'Sức khỏe': '#EF4444', 'Nhà cửa': '#14B8A6',
  'Hóa đơn': '#F97316', 'Khác': '#78716c', 'Lương': '#10B981', 'Thưởng': '#F59E0B',
}

type PeriodKey = '6m' | '3m' | '1m'
const PERIOD_LABELS: Record<PeriodKey, string> = { '6m': '6 tháng', '3m': '3 tháng', '1m': '1 tháng' }

function buildPieSlices(data: { label: string; color: string; amount: number; pct: number }[], radius = 60, cx = 80, cy = 80) {
  const total = data.reduce((s, d) => s + d.amount, 0)
  let start = -90
  return data.map(d => {
    const angle = total === 0 ? 0 : (d.amount / total) * 360
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
    return { ...d, x1, y1, x2, y2, largeArc, pct: Math.round((d.amount / (total || 1)) * 100) }
  })
}

export function ReportsPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<PeriodKey>('6m')
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryData, setCategoryData] = useState<{ label: string; color: string; amount: number; pct: number }[]>([])
  const [monthlyData, setMonthlyData] = useState<{ month: string; label: string; income: number; expense: number }[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)

    const monthsBack = period === '1m' ? 1 : period === '3m' ? 3 : 6
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsBack)
    startDate.setDate(1)

    supabase
      .from('transactions')
      .select('type, amount, category, date')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .then(({ data: txs, error: txErr }) => {
        if (txErr) {
          setError(txErr.message)
          setLoading(false)
          return
        }

        const transactions = txs ?? []

        // Category breakdown
        const byCategory: Record<string, number> = {}
        for (const tx of transactions) {
          if (tx.type === 'expense') {
            byCategory[tx.category] = (byCategory[tx.category] ?? 0) + Number(tx.amount)
          }
        }

        const totalExp = Object.values(byCategory).reduce((s, v) => s + v, 0)
        const categoryEntries = Object.entries(byCategory)
          .sort(([, a], [, b]) => b - a)
          .map(([label, amount]) => ({
            label,
            color: CATEGORY_COLORS[label] ?? '#78716c',
            amount,
            pct: totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0,
          }))

        setCategoryData(categoryEntries)
        setTotalExpense(totalExp)

        // Monthly breakdown
        const months: Record<string, { income: number; expense: number }> = {}
        for (const tx of transactions) {
          const d = new Date(tx.date)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!months[key]) months[key] = { income: 0, expense: 0 }
          if (tx.type === 'income') months[key].income += Number(tx.amount)
          else months[key].expense += Number(tx.amount)
        }

        const monthList = Object.entries(months)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, vals]) => {
            const month = key.split('-')[1]
            return {
              month: `T${month}`,
              label: `Tháng ${parseInt(month)}`,
              income: vals.income,
              expense: vals.expense,
            }
          })

        setMonthlyData(monthList)
        setTotalIncome(transactions.filter((t: Record<string, unknown>) => t.type === 'income').reduce((s: number, t: Record<string, unknown>) => s + Number(t.amount), 0))
        setLoading(false)
      })
  }, [user, period])

  const sliceData = buildPieSlices(categoryData)
  const maxMonthly = Math.max(
    ...monthlyData.map(d => Math.max(d.income, d.expense)),
    1
  )
  const chartHeight = 200

  const avgSavings = monthlyData.length > 0
    ? (totalIncome - totalExpense) / monthlyData.length
    : 0
  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
    : 0

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in-up`}>
        <div>
          <h1 className={styles.pageTitle}>Báo cáo</h1>
          <p className={styles.headerMeta}>
            {loading ? 'Đang tải...' : `${categoryData.length} danh mục chi tiêu`}
          </p>
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

      {error && (
        <div className={styles.errorBanner}>
          <span>Không thể tải báo cáo: {error}</span>
        </div>
      )}

      {loading ? (
        <div className={`${styles.grid} animate-fade-in-up`} style={{ animationDelay: '80ms' }}>
          <Card className={styles.chartCard}>
            <CardHeader className={styles.cardHeader}><CardTitle>Chi tiêu theo danh mục</CardTitle></CardHeader>
            <CardContent>
              <div className={styles.loadingState}>
                <div className="spinner spinner-lg" />
                <p>Đang tải dữ liệu...</p>
              </div>
            </CardContent>
          </Card>
          <Card className={styles.chartCard}>
            <CardHeader className={styles.cardHeader}><CardTitle>Thu chi theo tháng</CardTitle></CardHeader>
            <CardContent>
              <div className={styles.loadingState}>
                <div className="spinner spinner-lg" />
                <p>Đang tải dữ liệu...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : categoryData.length === 0 && monthlyData.length === 0 ? (
        <div className={styles.emptyReport}>
          <p>Chưa có đủ dữ liệu để hiển thị báo cáo.</p>
          <p>Thêm giao dịch để xem báo cáo chi tiết.</p>
        </div>
      ) : (
        <div className={`${styles.grid} animate-fade-in-up`} style={{ animationDelay: '80ms' }}>
          {/* Pie Chart */}
          <Card className={styles.chartCard}>
            <CardHeader className={styles.cardHeader}>
              <CardTitle>Chi tiêu theo danh mục</CardTitle>
              <span className={styles.chartMeta}>{PERIOD_LABELS[period]}</span>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className={styles.emptyChart}>
                  <p>Chưa có chi tiêu trong kỳ này</p>
                </div>
              ) : (
                <div className={styles.pieWrapper}>
                  <div className={styles.pieContainer}>
                    <svg viewBox="0 0 160 160" className={styles.pieSvg}>
                      <circle cx="80" cy="80" r="60" fill="none" stroke="var(--neutral-light)" strokeWidth="28" />
                      {sliceData.map((slice) => (
                        <path
                          key={slice.label}
                          d={`M 80 80 L ${slice.x1} ${slice.y1} A 60 60 0 ${slice.largeArc} 1 ${slice.x2} ${slice.y2} Z`}
                          fill={slice.color}
                          stroke="white"
                          strokeWidth="2"
                          className={`${styles.pieSlice} ${hoveredSlice === slice.label ? styles.pieSliceHover : ''}`}
                          onMouseEnter={() => setHoveredSlice(slice.label)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      ))}
                      <circle cx="80" cy="80" r="42" fill="var(--surface)" />
                      <text x="80" y="76" textAnchor="middle" className={styles.pieTotalText}>
                        {formatCurrency(totalExpense, 'VND').replace(' ₫', '')}
                      </text>
                      <text x="80" y="91" textAnchor="middle" className={styles.pieTotalLabel}>Tổng chi</text>
                    </svg>
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

                  <div className={styles.legend}>
                    {categoryData.map(item => (
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
                        <div className={styles.legendBar}>
                          <div className={styles.legendBarFill} style={{ width: `${item.pct}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart */}
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
              {monthlyData.length === 0 ? (
                <div className={styles.emptyChart}>
                  <p>Chưa có dữ liệu thu chi</p>
                </div>
              ) : (
                <>
                  <div className={styles.barChart}>
                    {monthlyData.map(({ month, income, expense }) => (
                      <div key={month} className={styles.barGroup} title={`${month}: Thu ${formatCurrency(income)}, Chi ${formatCurrency(expense)}`}>
                        <div className={styles.bars}>
                          <div className={styles.barIncome} style={{ height: `${Math.max(4, (income / maxMonthly) * chartHeight)}px` }} />
                          <div className={styles.barExpense} style={{ height: `${Math.max(4, (expense / maxMonthly) * chartHeight)}px` }} />
                        </div>
                        <span className={styles.barLabel}>{month}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.monthlySummary}>
                    {monthlyData.map(({ month, income, expense }) => (
                      <div key={month} className={styles.monthlyItem}>
                        <span className={styles.monthlyMonth}>{month}</span>
                        <span className={styles.monthlyIncome}>{formatCurrency(income)}</span>
                        <span className={styles.monthlyExpense}>{formatCurrency(expense)}</span>
                        <span className={`${styles.monthlyDiff} ${income - expense >= 0 ? styles.diffPositive : styles.diffNegative}`}>
                          {income >= expense ? '+' : ''}{formatCurrency(income - expense)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Grid */}
      {!loading && !error && (totalIncome > 0 || totalExpense > 0) && (
        <div className={`${styles.statsGrid} animate-fade-in-up`} style={{ animationDelay: '160ms' }}>
          {[
            { label: 'Tổng thu nhập', value: formatCurrency(totalIncome).replace(' ₫', ''), color: 'var(--success)', note: PERIOD_LABELS[period] },
            { label: 'Tổng chi tiêu', value: formatCurrency(totalExpense).replace(' ₫', ''), color: 'var(--error)', note: PERIOD_LABELS[period] },
            { label: 'Tiết kiệm TB/tháng', value: formatCurrency(avgSavings).replace(' ₫', ''), color: 'var(--primary)', note: 'Mỗi tháng' },
            { label: 'Tỷ lệ tiết kiệm', value: `${savingsRate}%`, color: 'var(--secondary)', note: 'Trung bình' },
          ].map(stat => (
            <Card key={stat.label} className={styles.statCard}>
              <p className={styles.statLabel}>{stat.label}</p>
              <p className={styles.statValue} style={{ color: stat.color }}>{stat.value}</p>
              <p className={styles.statNote}>{stat.note}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
