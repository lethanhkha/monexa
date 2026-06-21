import { useState } from 'react'
import { Card, CardContent, Button, Dialog, DialogFooter, Badge } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Plus, Filter, Search, X, SlidersHorizontal, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTransactions } from '../hooks/useTransactions'
import { useWallets } from '@/features/wallets/hooks/useWallets'
import { useAuth } from '@/features/auth/hooks/useAuth'
import styles from './TransactionsPage.module.css'
import toast from 'react-hot-toast'

type TxType = 'income' | 'expense'

const CATEGORIES_INCOME = ['Lương', 'Thưởng', 'Đầu tư', 'Phụ cấp', 'Khác']
const CATEGORIES_EXPENSE = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Sức khỏe', 'Nhà cửa', 'Hóa đơn', 'Khác']

type FormState = {
  type: TxType
  amount: string
  category: string
  note: string
  wallet_id: string
  date: string
}

const emptyForm = (): FormState => ({
  type: 'expense',
  amount: '',
  category: '',
  note: '',
  wallet_id: '',
  date: new Date().toISOString().split('T')[0],
})

export function TransactionsPage() {
  const { user } = useAuth()
  const { transactions, loading, error, addTransaction, deleteTransaction } = useTransactions(user?.id)
  const { wallets } = useWallets(user?.id)

  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterType, setFilterType] = useState<TxType | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortDesc, setSortDesc] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = transactions
    .filter(tx => {
      const matchSearch =
        !search ||
        tx.category.toLowerCase().includes(search.toLowerCase()) ||
        (tx.note ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.wallets?.name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchType = filterType === 'all' || tx.type === filterType
      const matchCat = filterCategory === 'all' || tx.category === filterCategory
      return matchSearch && matchType && matchCat
    })
    .sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
      return sortDesc ? diff : -diff
    })

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const resetFilters = () => {
    setFilterType('all')
    setFilterCategory('all')
    setSearch('')
  }

  const hasActiveFilters = filterType !== 'all' || filterCategory !== 'all' || search !== ''

  const openAdd = () => {
    setForm({ ...emptyForm(), wallet_id: wallets[0]?.id ?? '' })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm(emptyForm())
    setErrors({})
  }

  const validate = () => {
    const e: Partial<FormState> = {}
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Số tiền phải lớn hơn 0'
    if (!form.category) e.category = 'Chọn danh mục'
    if (!form.wallet_id) e.wallet_id = 'Chọn ví'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await addTransaction({
        type: form.type,
        amount: Number(form.amount),
        currency: 'VND',
        category: form.category,
        note: form.note,
        wallet_id: form.wallet_id,
        date: new Date(form.date).toISOString(),
        is_recurring: false,
      })
      toast.success('Đã thêm giao dịch')
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm giao dịch')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id)
      toast.success('Đã xóa giao dịch')
      setDeletingId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa giao dịch')
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in-up`}>
        <div>
          <h1 className={styles.pageTitle}>Giao dịch</h1>
          <p className={styles.headerMeta}>
            {filtered.length} giao dịch
            {hasActiveFilters && ' (đã lọc)'}
          </p>
        </div>
        <Button onClick={openAdd} disabled={wallets.length === 0}>
          <Plus size={16} /> Thêm giao dịch
        </Button>
      </div>

      {/* Toolbar */}
      <div className={`${styles.toolbar} animate-fade-in-up`} style={{ animationDelay: '60ms' }}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <button
          className={`${styles.filterToggle} ${filterOpen ? styles.filterToggleActive : ''}`}
          onClick={() => setFilterOpen(f => !f)}
        >
          <SlidersHorizontal size={16} />
          Bộ lọc
          {hasActiveFilters && !filterOpen && (
            <span className={styles.filterBadge}>
              {[filterType !== 'all', filterCategory !== 'all'].filter(Boolean).length}
            </span>
          )}
          {filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Filter Panel */}
      {filterOpen && (
        <div className={`${styles.filterPanel} animate-fade-in`}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Loại</span>
            <div className={styles.filterChips}>
              {(['all', 'income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  className={`${styles.chip} ${filterType === t ? styles.chipActive : ''}`}
                  onClick={() => setFilterType(t)}
                >
                  {t === 'all' ? 'Tất cả' : t === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Danh mục</span>
            <div className={styles.filterChips}>
              <button
                className={`${styles.chip} ${filterCategory === 'all' ? styles.chipActive : ''}`}
                onClick={() => setFilterCategory('all')}
              >
                Tất cả
              </button>
              {(filterType === 'all' ? [...CATEGORIES_INCOME, ...CATEGORIES_EXPENSE] : filterType === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(cat => (
                <button
                  key={cat}
                  className={`${styles.chip} ${filterCategory === cat ? styles.chipActive : ''}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button className={styles.resetBtn} onClick={resetFilters}>
              <X size={13} /> Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Summary Row */}
      {hasActiveFilters && (
        <div className={`${styles.summaryRow} animate-fade-in`}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Thu:</span>
            <span className={styles.summaryIncome}>{formatCurrency(totalIncome)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Chi:</span>
            <span className={styles.summaryExpense}>{formatCurrency(totalExpense)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Còn:</span>
            <span className={totalIncome - totalExpense >= 0 ? styles.summaryIncome : styles.summaryExpense}>
              {formatCurrency(Math.abs(totalIncome - totalExpense))}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>Không thể tải giao dịch: {error}</span>
        </div>
      )}

      {/* No wallets prompt */}
      {!loading && wallets.length === 0 && (
        <div className={styles.noWalletsBanner}>
          <p>Bạn chưa có ví nào. <a href="/wallets">Tạo ví đầu tiên</a> để thêm giao dịch.</p>
        </div>
      )}

      {/* Transactions List */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className={styles.tableHead}>
          <span className={styles.colType}>Loại</span>
          <span className={styles.colCategory}>Danh mục</span>
          <span className={styles.colNote}>Ghi chú</span>
          <span className={styles.colWallet}>Ví</span>
          <span className={styles.colDate} onClick={() => setSortDesc(d => !d)} style={{ cursor: 'pointer' }}>
            Ngày {sortDesc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </span>
          <span className={styles.colAmount}>Số tiền</span>
        </div>

        <CardContent className={styles.cardContentNoPad}>
          {loading ? (
            <div className={styles.txList}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={styles.txRow}>
                  <div className={`skeleton`} style={{ width: 60, height: 12, borderRadius: 6 }} />
                  <div className={`skeleton`} style={{ width: 80, height: 22, borderRadius: 99 }} />
                  <div style={{ flex: 1 }}>
                    <div className={`skeleton`} style={{ width: '60%', height: 13, marginBottom: 4 }} />
                    <div className={`skeleton`} style={{ width: '40%', height: 11 }} />
                  </div>
                  <div className={`skeleton`} style={{ width: 70, height: 13 }} />
                  <div className={`skeleton`} style={{ width: 70, height: 16, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <Filter size={32} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Không tìm thấy giao dịch</p>
              <p className={styles.emptyText}>
                {hasActiveFilters ? 'Thử thay đổi bộ lọc' : 'Bắt đầu bằng cách thêm giao dịch đầu tiên'}
              </p>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={resetFilters}>
                  <X size={15} /> Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <div className={styles.txList}>
              {filtered.map((tx, idx) => {
                const walletName = tx.wallets?.name ?? '—'
                return (
                  <div
                    key={tx.id}
                    className={`${styles.txRow} animate-fade-in`}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <span className={styles.colType}>
                      <span className={`${styles.txDot} ${tx.type === 'income' ? styles.dotIncome : styles.dotExpense}`} />
                      <span className={`${styles.typeLabel} ${tx.type === 'income' ? styles.typeIncome : styles.typeExpense}`}>
                        {tx.type === 'income' ? 'Thu' : 'Chi'}
                      </span>
                    </span>
                    <span className={styles.colCategory}>
                      <Badge variant={tx.type === 'income' ? 'success' : 'default'}>{tx.category}</Badge>
                    </span>
                    <span className={styles.colNote}>
                      <span className={styles.txNote}>{tx.note || '—'}</span>
                    </span>
                    <span className={styles.colWallet}>
                      <span className={styles.walletChip}>{walletName}</span>
                    </span>
                    <span className={styles.colDate}>
                      {formatDate(tx.date)}
                    </span>
                    <span className={`${styles.colAmount} ${tx.type === 'income' ? styles.amountIncome : styles.amountExpense}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                    </span>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setDeletingId(tx.id)}
                      title="Xóa giao dịch"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Thêm giao dịch"
        description="Nhập thông tin giao dịch của bạn."
      >
        <div className={styles.typeToggle}>
          <button
            className={`${styles.typeToggleBtn} ${form.type === 'expense' ? styles.typeToggleExpense : ''}`}
            onClick={() => setForm(f => ({ ...f, type: 'expense', category: '' }))}
            type="button"
          >
            Chi tiêu
          </button>
          <button
            className={`${styles.typeToggleBtn} ${form.type === 'income' ? styles.typeToggleIncome : ''}`}
            onClick={() => setForm(f => ({ ...f, type: 'income', category: '' }))}
            type="button"
          >
            Thu nhập
          </button>
        </div>

        <Input
          label="Số tiền (VND)"
          type="number"
          placeholder="0"
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          error={errors.amount}
          min={0}
        />

        <div className={styles.formField}>
          <label className={styles.formLabel}>Danh mục</label>
          <div className={styles.categoryGrid}>
            {(form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(cat => (
              <button
                key={cat}
                className={`${styles.catChip} ${form.category === cat ? styles.catChipActive : ''}`}
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
          {errors.category && <p className={styles.fieldError}>{errors.category}</p>}
        </div>

        <Input
          label="Ghi chú"
          placeholder="Mô tả ngắn về giao dịch..."
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
        />

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Ví</label>
            <select
              className={styles.select}
              value={form.wallet_id}
              onChange={e => setForm(f => ({ ...f, wallet_id: e.target.value }))}
            >
              <option value="">— Chọn ví —</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatCurrency(Number(w.balance), w.currency)})
                </option>
              ))}
            </select>
            {errors.wallet_id && <p className={styles.fieldError}>{errors.wallet_id}</p>}
          </div>
          <Input
            label="Ngày"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={closeModal}>
            <X size={15} /> Hủy
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Plus size={15} /> Thêm giao dịch
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deletingId !== null}
        onOpenChange={open => { if (!open) setDeletingId(null) }}
        title="Xóa giao dịch?"
        description="Giao dịch này sẽ bị xóa. Số dư ví sẽ được cập nhật lại."
      >
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            <X size={15} /> Hủy
          </Button>
          <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>
            Xóa giao dịch
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
