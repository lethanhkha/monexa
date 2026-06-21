import { useState } from 'react'
import { Card, Button, Badge, Dialog, DialogFooter } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Plus, TrendingUp, Calendar, Pencil, Trash2, X, Target, Clock, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from './SavingsPage.module.css'

const GOAL_COLORS = ['#10B981', '#38BDF8', '#A855F7', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316']
const ICONS = ['✈️', '🚗', '🏠', '💻', '📱', '🎓', '💍', '🏥']

interface SavingsGoal {
  id: string
  name: string
  target: number
  current: number
  deadline: string
  color: string
  icon: string
}

interface FormState {
  name: string
  target: string
  current: string
  deadline: string
  color: string
  icon: string
}

const mockGoals: SavingsGoal[] = [
  { id: '1', name: 'Du lịch Nhật Bản', target: 50_000_000, current: 32_500_000, deadline: '2026-12-31', color: '#38BDF8', icon: '✈️' },
  { id: '2', name: 'Mua xe máy', target: 35_000_000, current: 8_000_000, deadline: '2027-06-01', color: '#A855F7', icon: '🚗' },
  { id: '3', name: 'Quỹ khẩn cấp', target: 20_000_000, current: 20_000_000, deadline: '2026-09-01', color: '#10B981', icon: '🏥' },
]

const emptyForm = (): FormState => ({
  name: '',
  target: '',
  current: '0',
  deadline: '',
  color: GOAL_COLORS[0],
  icon: ICONS[0],
})

export function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>(mockGoals)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Partial<FormState>>({})

  const totalSaved = goals.reduce((s, g) => s + g.current, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)
  const completedCount = goals.filter(g => g.current >= g.target).length

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (g: SavingsGoal) => {
    setEditId(g.id)
    setForm({
      name: g.name,
      target: g.target.toString(),
      current: g.current.toString(),
      deadline: g.deadline,
      color: g.color,
      icon: g.icon,
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
    setForm(emptyForm())
    setErrors({})
  }

  const validate = () => {
    const e: Partial<FormState> = {}
    if (!form.name.trim()) e.name = 'Nhập tên mục tiêu'
    if (!form.target || isNaN(Number(form.target)) || Number(form.target) <= 0)
      e.target = 'Hạn mức phải lớn hơn 0'
    if (!form.deadline) e.deadline = 'Chọn ngày deadline'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data: SavingsGoal = {
      id: editId || Date.now().toString(),
      name: form.name.trim(),
      target: Number(form.target),
      current: editId ? goals.find(g => g.id === editId)!.current : Number(form.current),
      deadline: form.deadline,
      color: form.color,
      icon: form.icon,
    }
    if (editId) {
      setGoals(prev => prev.map(g => g.id === editId ? data : g))
    } else {
      setGoals(prev => [...prev, data])
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    setDeleteId(null)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in-up`}>
        <div>
          <h1 className={styles.pageTitle}>Mục tiêu tiết kiệm</h1>
          <p className={styles.headerMeta}>
            {completedCount}/{goals.length} mục tiêu hoàn thành
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Thêm mục tiêu
        </Button>
      </div>

      {/* Summary Stats */}
      <div className={`${styles.statsRow} animate-fade-in-up`} style={{ animationDelay: '60ms' }}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Target size={18} />
          </div>
          <div>
            <p className={styles.statValue}>{formatCurrency(totalSaved)}</p>
            <p className={styles.statLabel}>Đã tiết kiệm</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <p className={styles.statValue}>{formatCurrency(totalTarget)}</p>
            <p className={styles.statLabel}>Mục tiêu</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className={styles.statValue}>{completedCount}</p>
            <p className={styles.statLabel}>Hoàn thành</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Clock size={18} />
          </div>
          <div>
            <p className={styles.statValue}>{goals.length - completedCount}</p>
            <p className={styles.statLabel}>Đang tiết kiệm</p>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className={`${styles.grid} stagger-children`}>
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
          const completed = pct >= 100
          const daysLeft = goal.deadline
            ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null

          return (
            <Card key={goal.id} className={`${styles.goalCard} animate-fade-in-up`}>
              {/* Top row */}
              <div className={styles.goalHeader}>
                <div className={styles.goalIcon} style={{ background: `${goal.color}18` }}>
                  <span className={styles.goalEmoji}>{goal.icon}</span>
                </div>
                <div className={styles.goalActions}>
                  <button className={styles.iconBtn} onClick={() => openEdit(goal)} title="Sửa">
                    <Pencil size={13} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteId(goal.id)} title="Xóa">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Goal info */}
              <div className={styles.goalInfo}>
                <h3 className={styles.goalName}>{goal.name}</h3>
                {completed
                  ? <Badge variant="success" className={styles.badgeCompleted}><CheckCircle2 size={10} /> Hoàn thành!</Badge>
                  : daysLeft !== null && (
                    <Badge variant={daysLeft < 30 ? 'warning' : 'default'} className={styles.badgeDeadline}>
                      <Calendar size={10} /> {daysLeft === 0 ? 'Hết hạn hôm nay!' : `${daysLeft} ngày còn lại`}
                    </Badge>
                  )
                }
              </div>

              {/* Amounts */}
              <div className={styles.amounts}>
                <div>
                  <p className={styles.currentAmount} style={{ color: goal.color }}>
                    {formatCurrency(goal.current)}
                  </p>
                  <p className={styles.currentLabel}>đã có</p>
                </div>
                <div className={styles.amountSlash}>/</div>
                <div>
                  <p className={styles.targetAmount}>{formatCurrency(goal.target)}</p>
                  <p className={styles.targetLabel}>mục tiêu</p>
                </div>
              </div>

              {/* Progress */}
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${pct}%`, background: goal.color }}
                />
              </div>

              {/* Footer */}
              <div className={styles.goalFooter}>
                <span className={styles.pctBadge} style={{ background: `${goal.color}18`, color: goal.color }}>
                  {pct}%
                </span>
                <span className={styles.deadlineText}>
                  <Calendar size={11} />
                  {formatDate(goal.deadline)}
                </span>
              </div>

              {/* Color accent */}
              <div className={styles.colorBar} style={{ background: goal.color }} />
            </Card>
          )
        })}

        {/* Add Card */}
        <button className={styles.addCard} onClick={openAdd}>
          <div className={styles.addCardIcon}><Plus size={24} /></div>
          <p className={styles.addCardLabel}>Thêm mục tiêu</p>
        </button>
      </div>

      {/* Add/Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editId ? 'Sửa mục tiêu' : 'Thêm mục tiêu tiết kiệm'}
        description="Đặt mục tiêu và deadline để theo dõi tiến độ."
      >
        <Input
          label="Tên mục tiêu"
          placeholder="Ví dụ: Du lịch Nhật Bản, Mua xe..."
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          error={errors.name}
          autoFocus
        />

        <div className={styles.formRow}>
          <Input
            label="Số tiền mục tiêu (VND)"
            type="number"
            placeholder="50.000.000"
            value={form.target}
            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            error={errors.target}
            min={0}
          />
          <Input
            label="Đã tiết kiệm được"
            type="number"
            placeholder="0"
            value={form.current}
            onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
            min={0}
          />
        </div>

        <Input
          label="Ngày deadline"
          type="date"
          value={form.deadline}
          onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          error={errors.deadline}
        />

        <div className={styles.formField}>
          <label className={styles.formLabel}>Icon</label>
          <div className={styles.iconGrid}>
            {ICONS.map(icon => (
              <button
                key={icon}
                className={`${styles.iconBtn2} ${form.icon === icon ? styles.iconBtn2Active : ''}`}
                onClick={() => setForm(f => ({ ...f, icon }))}
                type="button"
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Màu sắc</label>
          <div className={styles.colorPicker}>
            {GOAL_COLORS.map(color => (
              <button
                key={color}
                className={`${styles.colorSwatch} ${form.color === color ? styles.colorSwatchActive : ''}`}
                style={{ background: color }}
                onClick={() => setForm(f => ({ ...f, color }))}
                type="button"
              >
                {form.color === color && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={closeModal}><X size={15} /> Hủy</Button>
          <Button onClick={handleSubmit}><Plus size={15} /> {editId ? 'Lưu thay đổi' : 'Tạo mục tiêu'}</Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        title="Xóa mục tiêu?"
        description="Mục tiêu này và toàn bộ tiến độ sẽ bị xóa."
      >
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}><X size={15} /> Hủy</Button>
          <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}><Trash2 size={15} /> Xóa mục tiêu</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
