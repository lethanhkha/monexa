import { useState } from 'react'
import { Card, Button, Dialog, DialogFooter } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Plus, AlertCircle, Pencil, Trash2, X, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import styles from './BudgetsPage.module.css'

const CATEGORY_OPTIONS = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Sức khỏe', 'Nhà cửa', 'Hóa đơn', 'Khác']
const CATEGORY_COLORS: Record<string, string> = {
  'Ăn uống': '#10B981',
  'Di chuyển': '#38BDF8',
  'Mua sắm': '#F59E0B',
  'Giải trí': '#A855F7',
  'Sức khỏe': '#EF4444',
  'Nhà cửa': '#14B8A6',
  'Hóa đơn': '#F97316',
  'Khác': '#78716c',
}

interface Budget {
  id: string
  category: string
  spent: number
  limit: number
  color: string
}

interface FormState {
  category: string
  limit: string
  period: 'monthly' | 'weekly'
}

const mockBudgets: Budget[] = [
  { id: '1', category: 'Ăn uống', spent: 2_100_000, limit: 3_000_000, color: '#10B981' },
  { id: '2', category: 'Di chuyển', spent: 850_000, limit: 1_000_000, color: '#38BDF8' },
  { id: '3', category: 'Giải trí', spent: 600_000, limit: 500_000, color: '#A855F7' },
  { id: '4', category: 'Mua sắm', spent: 400_000, limit: 2_000_000, color: '#F59E0B' },
  { id: '5', category: 'Sức khỏe', spent: 150_000, limit: 500_000, color: '#EF4444' },
]

const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const now = new Date()

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ category: '', limit: '', period: 'monthly' })
  const [errors, setErrors] = useState<Partial<FormState>>({})

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overAllPct = Math.min(100, Math.round((totalSpent / totalBudget) * 100))

  const openAdd = () => {
    setEditId(null)
    setForm({ category: '', limit: '', period: 'monthly' })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (b: Budget) => {
    setEditId(b.id)
    setForm({ category: b.category, limit: b.limit.toString(), period: 'monthly' })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
    setForm({ category: '', limit: '', period: 'monthly' })
    setErrors({})
  }

  const validate = () => {
    const e: Partial<FormState> = {}
    if (!form.category) e.category = 'Chọn danh mục'
    if (!form.limit || isNaN(Number(form.limit)) || Number(form.limit) <= 0)
      e.limit = 'Hạn mức phải lớn hơn 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data: Budget = {
      id: editId || Date.now().toString(),
      category: form.category,
      spent: editId ? budgets.find(b => b.id === editId)!.spent : 0,
      limit: Number(form.limit),
      color: CATEGORY_COLORS[form.category] || '#78716c',
    }
    if (editId) {
      setBudgets(prev => prev.map(b => b.id === editId ? data : b))
    } else {
      setBudgets(prev => [...prev, data])
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id))
    setDeleteId(null)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in-up`}>
        <div>
          <h1 className={styles.pageTitle}>Ngân sách</h1>
          <p className={styles.subtitle}>
            {MONTH_NAMES[now.getMonth()]}/{now.getFullYear()} · {budgets.length} danh mục
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Thêm ngân sách
        </Button>
      </div>

      {/* Overall Summary */}
      <div className={`${styles.overallCard} animate-fade-in-up`} style={{ animationDelay: '60ms' }}>
        <div className={styles.overallLeft}>
          <p className={styles.overallLabel}>Tổng ngân sách tháng</p>
          <p className={styles.overallAmount}>{formatCurrency(totalBudget)}</p>
          <p className={styles.overallSpent}>
            Đã chi: <strong>{formatCurrency(totalSpent)}</strong>
            <span className={styles.overallPct}>{overAllPct}%</span>
          </p>
        </div>
        <div className={styles.overallRight}>
          <div className={styles.circularProgress}>
            <svg viewBox="0 0 36 36" className={styles.circularSvg}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--neutral-light)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={overAllPct > 100 ? 'var(--error)' : overAllPct > 80 ? 'var(--warning)' : 'var(--success)'}
                strokeWidth="3"
                strokeDasharray={`${overAllPct}, 100`}
                strokeLinecap="round"
                className={styles.circularPath}
              />
            </svg>
            <div className={styles.circularCenter}>
              <TrendingDown size={14} />
              <span>{overAllPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Grid */}
      <div className={`${styles.grid} stagger-children`}>
        {budgets.map((b) => {
          const pct = Math.min(100, Math.round((b.spent / b.limit) * 100))
          const remaining = b.limit - b.spent
          const overBudget = remaining < 0
          const status = overBudget ? 'over' : pct >= 80 ? 'warn' : 'ok'

          return (
            <Card key={b.id} className={`${styles.budgetCard} animate-fade-in-up`}>
              <div className={styles.cardTop}>
                <div className={styles.categoryInfo}>
                  <span className={styles.categoryDot} style={{ background: b.color }} />
                  <h3 className={styles.categoryName}>{b.category}</h3>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => openEdit(b)} title="Sửa">
                    <Pencil size={13} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteId(b.id)} title="Xóa">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: b.color,
                    animationDelay: `${Math.random() * 0.3}s`,
                  }}
                />
              </div>

              <div className={styles.amounts}>
                <div className={styles.amountLeft}>
                  <span className={styles.spent}>{formatCurrency(b.spent)}</span>
                  <span className={styles.spentLabel}>đã chi</span>
                </div>
                <div className={styles.amountRight}>
                  <span
                    className={styles.remaining}
                    style={{ color: overBudget ? 'var(--error)' : 'var(--success)' }}
                  >
                    {overBudget
                      ? `Vượt ${formatCurrency(Math.abs(remaining))}`
                      : `${formatCurrency(remaining)}`}
                  </span>
                  <span className={styles.remainingLabel}>{overBudget ? 'vượt hạn' : 'còn lại'}</span>
                </div>
              </div>

              <div className={styles.limitBar}>
                <span className={styles.limitLabel}>Hạn mức</span>
                <span className={styles.limitValue}>{formatCurrency(b.limit)}</span>
              </div>

              {status !== 'ok' && (
                <div className={`${styles.alertBanner} ${status === 'over' ? styles.alertOver : styles.alertWarn}`}>
                  {status === 'over' ? <AlertCircle size={13} /> : <AlertCircle size={13} />}
                  <span>{status === 'over' ? 'Đã vượt ngân sách!' : 'Sắp hết ngân sách!'}</span>
                </div>
              )}
            </Card>
          )
        })}

        {/* Add Card */}
        <button className={styles.addCard} onClick={openAdd}>
          <div className={styles.addCardIcon}><Plus size={22} /></div>
          <p className={styles.addCardLabel}>Thêm ngân sách</p>
        </button>
      </div>

      {/* Add/Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editId ? 'Sửa ngân sách' : 'Thêm ngân sách'}
        description="Đặt hạn mức chi tiêu cho danh mục."
      >
        <div className={styles.formField}>
          <label className={styles.formLabel}>Danh mục</label>
          <div className={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat}
                className={`${styles.catChip} ${form.category === cat ? styles.catChipActive : ''}`}
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                type="button"
                style={form.category === cat ? { borderColor: CATEGORY_COLORS[cat], background: CATEGORY_COLORS[cat] + '15', color: CATEGORY_COLORS[cat] } : {}}
              >
                <span className={styles.catDot} style={{ background: CATEGORY_COLORS[cat] }} />
                {cat}
              </button>
            ))}
          </div>
          {errors.category && <p className={styles.fieldError}>{errors.category}</p>}
        </div>

        <Input
          label="Hạn mức tháng (VND)"
          type="number"
          placeholder="3.000.000"
          value={form.limit}
          onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
          error={errors.limit}
          min={0}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={closeModal}>
            <X size={15} /> Hủy
          </Button>
          <Button onClick={handleSubmit}>
            <Plus size={15} /> {editId ? 'Lưu thay đổi' : 'Tạo ngân sách'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        title="Xóa ngân sách?"
        description="Ngân sách này sẽ bị xóa vĩnh viễn."
      >
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            <X size={15} /> Hủy
          </Button>
          <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
            <Trash2 size={15} /> Xóa ngân sách
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
