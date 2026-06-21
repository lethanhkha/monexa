import { useState } from 'react'
import { Card, Button, Dialog, DialogFooter } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Plus, AlertCircle, Pencil, Trash2, X, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBudgets } from '../hooks/useBudgets'
import { useAuth } from '@/features/auth/hooks/useAuth'
import styles from './BudgetsPage.module.css'
import toast from 'react-hot-toast'

const CATEGORY_OPTIONS = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Sức khỏe', 'Nhà cửa', 'Hóa đơn', 'Khác']
const CATEGORY_COLORS: Record<string, string> = {
  'Ăn uống': '#10B981', 'Di chuyển': '#38BDF8', 'Mua sắm': '#F59E0B',
  'Giải trí': '#A855F7', 'Sức khỏe': '#EF4444', 'Nhà cửa': '#14B8A6',
  'Hóa đơn': '#F97316', 'Khác': '#78716c',
}

type FormState = {
  category: string
  limit: string
  period: 'monthly' | 'weekly'
}

const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const now = new Date()

export function BudgetsPage() {
  const { user } = useAuth()
  const { budgets, loading, error, addBudget, updateBudget, deleteBudget } = useBudgets(user?.id)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ category: '', limit: '', period: 'monthly' })
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitting, setSubmitting] = useState(false)

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)

  const openAdd = () => {
    setEditId(null)
    setForm({ category: '', limit: '', period: 'monthly' })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (b: typeof budgets[number]) => {
    setEditId(b.id)
    setForm({ category: b.category, limit: b.amount.toString(), period: b.period })
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

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      if (editId) {
        await updateBudget(editId, {
          category: form.category,
          amount: Number(form.limit),
          period: form.period,
          start_date: new Date().toISOString().split('T')[0],
          alert_threshold: 80,
        })
        toast.success('Đã cập nhật ngân sách')
      } else {
        await addBudget({
          category: form.category,
          amount: Number(form.limit),
          period: form.period,
          start_date: new Date().toISOString().split('T')[0],
          alert_threshold: 80,
        })
        toast.success('Đã thêm ngân sách')
      }
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id)
      toast.success('Đã xóa ngân sách')
      setDeleteId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa')
    }
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

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>Không thể tải ngân sách: {error}</span>
        </div>
      )}

      {/* Overall Summary */}
      {loading ? (
        <div className={styles.overallSkeleton}>
          <div className={`skeleton`} style={{ height: 100, borderRadius: 16 }} />
        </div>
      ) : (
        <div className={`${styles.overallCard} animate-fade-in-up`} style={{ animationDelay: '60ms' }}>
          <div className={styles.overallLeft}>
            <p className={styles.overallLabel}>Tổng ngân sách tháng</p>
            <p className={styles.overallAmount}>{formatCurrency(totalBudget)}</p>
          </div>
          <div className={styles.overallRight}>
            <div className={styles.circularProgress}>
              <svg viewBox="0 0 36 36" className={styles.circularSvg}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--neutral-light)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray="100, 100" strokeLinecap="round" />
              </svg>
              <div className={styles.circularCenter}>
                <TrendingDown size={14} />
                <span>{budgets.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Grid */}
      {loading ? (
        <div className={styles.grid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.skeletonCard}>
              <div className={`skeleton`} style={{ width: '50%', height: 18 }} />
              <div className={`skeleton`} style={{ width: '100%', height: 10, borderRadius: 99, marginTop: 12 }} />
              <div className={`skeleton`} style={{ width: '70%', height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className={`${styles.grid} stagger-children`}>
          {budgets.map(b => {
            const limit = Number(b.amount)
            const spent = 0 // Will be computed from transactions in a real implementation
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
            const remaining = limit - spent
            const overBudget = remaining < 0
            const color = CATEGORY_COLORS[b.category] || '#78716c'

            return (
              <Card key={b.id} className={`${styles.budgetCard} animate-fade-in-up`}>
                <div className={styles.cardTop}>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryDot} style={{ background: color }} />
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
                  <div className={styles.progressBar} style={{ width: `${pct}%`, background: color }} />
                </div>

                <div className={styles.amounts}>
                  <div className={styles.amountLeft}>
                    <span className={styles.spent}>{formatCurrency(spent)}</span>
                    <span className={styles.spentLabel}>đã chi</span>
                  </div>
                  <div className={styles.amountRight}>
                    <span className={styles.remaining} style={{ color: overBudget ? 'var(--error)' : 'var(--success)' }}>
                      {overBudget ? `Vượt ${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)}`}
                    </span>
                    <span className={styles.remainingLabel}>{overBudget ? 'vượt hạn' : 'còn lại'}</span>
                  </div>
                </div>

                <div className={styles.limitBar}>
                  <span className={styles.limitLabel}>Hạn mức</span>
                  <span className={styles.limitValue}>{formatCurrency(limit)}</span>
                </div>
              </Card>
            )
          })}

          <button className={styles.addCard} onClick={openAdd}>
            <div className={styles.addCardIcon}><Plus size={22} /></div>
            <p className={styles.addCardLabel}>Thêm ngân sách</p>
          </button>
        </div>
      )}

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
          <Button onClick={handleSubmit} loading={submitting}>
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
