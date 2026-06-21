import { useState } from 'react'
import { Card, Badge, Button, Dialog, DialogFooter } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { Wallet as WalletIcon, Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useWallets } from '../hooks/useWallets'
import { useAuth } from '@/features/auth/hooks/useAuth'
import styles from './WalletsPage.module.css'
import toast from 'react-hot-toast'

const WALLET_COLORS = [
  '#10B981', '#38BDF8', '#A855F7', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
]

const WALLET_TYPES: Record<string, string> = {
  cash: 'Tiền mặt',
  bank: 'Ngân hàng',
  'e-wallet': 'Ví điện tử',
}

type WalletType = 'cash' | 'bank' | 'e-wallet'
type Currency = 'VND' | 'USD'

interface FormState {
  name: string
  type: WalletType
  balance: string
  currency: Currency
  color: string
}

const emptyForm = (): FormState => ({
  name: '', type: 'cash', balance: '', currency: 'VND', color: WALLET_COLORS[0],
})

export function WalletsPage() {
  const { user } = useAuth()
  const { wallets, loading, error, addWallet, updateWallet, deleteWallet } = useWallets(user?.id)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitting, setSubmitting] = useState(false)

  const totalVND = wallets
    .filter(w => w.currency === 'VND')
    .reduce((sum, w) => sum + Number(w.balance), 0)
  const totalUSD = wallets
    .filter(w => w.currency === 'USD')
    .reduce((sum, w) => sum + Number(w.balance), 0)

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (wallet: typeof wallets[number]) => {
    setEditId(wallet.id)
    setForm({
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance.toString(),
      currency: wallet.currency,
      color: wallet.color ?? WALLET_COLORS[0],
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
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên ví'
    if (!form.balance || isNaN(Number(form.balance)) || Number(form.balance) < 0)
      e.balance = 'Số dư phải là số không âm'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      if (editId) {
        await updateWallet(editId, {
          name: form.name.trim(),
          type: form.type,
          balance: Number(form.balance),
          currency: form.currency,
          color: form.color,
        })
        toast.success('Đã cập nhật ví')
      } else {
        await addWallet({
          name: form.name.trim(),
          type: form.type,
          balance: Number(form.balance),
          currency: form.currency,
          color: form.color,
        })
        toast.success('Đã thêm ví mới')
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
      await deleteWallet(id)
      toast.success('Đã xóa ví')
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
          <h1 className={styles.pageTitle}>Ví của tôi</h1>
          <p className={styles.headerMeta}>
            {wallets.length} ví ·{' '}
            <span className={styles.totalVND}>{formatCurrency(totalVND)}</span>
            {totalUSD > 0 && (
              <span className={styles.totalUSD}> · {formatCurrency(totalUSD, 'USD')}</span>
            )}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Thêm ví mới
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>Không thể tải ví: {error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className={styles.walletsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.skeletonCard}>
              <div className={`skeleton`} style={{ width: 48, height: 48, borderRadius: 12 }} />
              <div className={`skeleton`} style={{ width: '60%', height: 18, marginTop: 12 }} />
              <div className={`skeleton`} style={{ width: '40%', height: 24, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className={`${styles.walletsGrid} stagger-children`}>
          {wallets.map(wallet => (
            <Card key={wallet.id} className={`${styles.walletCard} animate-fade-in-up`}>
              <div className={styles.walletTop}>
                <div
                  className={styles.walletIcon}
                  style={{ background: `${wallet.color ?? '#10B981'}18`, borderColor: `${wallet.color ?? '#10B981'}35` }}
                >
                  <WalletIcon size={20} color={wallet.color ?? '#10B981'} />
                </div>
                <div className={styles.walletActions}>
                  <button className={styles.iconBtn} onClick={() => openEdit(wallet)} title="Sửa ví">
                    <Pencil size={13} />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setDeleteId(wallet.id)} title="Xóa ví">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className={styles.walletInfo}>
                <h3 className={styles.walletName}>{wallet.name}</h3>
                <Badge variant="default" className={styles.typeBadge}>
                  {WALLET_TYPES[wallet.type]}
                </Badge>
              </div>
              <div className={styles.walletBalance}>
                <p className={styles.balanceAmount} style={{ color: wallet.color ?? '#10B981' }}>
                  {formatCurrency(Number(wallet.balance), wallet.currency)}
                </p>
                <p className={styles.balanceLabel}>Số dư</p>
              </div>
              <div className={styles.colorBar} style={{ background: wallet.color ?? '#10B981' }} />
            </Card>
          ))}

          <button className={styles.addCard} onClick={openAdd}>
            <div className={styles.addCardIcon}>
              <Plus size={24} />
            </div>
            <p className={styles.addCardLabel}>Thêm ví mới</p>
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editId ? 'Sửa ví' : 'Thêm ví mới'}
        description={editId ? 'Cập nhật thông tin ví của bạn.' : 'Tạo ví mới để quản lý chi tiêu.'}
      >
        <Input
          label="Tên ví"
          placeholder="Ví dụ: TPBank, MoMo, Tiền mặt..."
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          error={errors.name}
          autoFocus
        />

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Loại ví</label>
            <div className={styles.typeSelect}>
              {(['cash', 'bank', 'e-wallet'] as WalletType[]).map(type => (
                <button
                  key={type}
                  className={`${styles.typeOption} ${form.type === type ? styles.typeOptionActive : ''}`}
                  onClick={() => setForm(f => ({ ...f, type }))}
                  type="button"
                >
                  {WALLET_TYPES[type]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField} style={{ flex: 2 }}>
            <Input
              label="Số dư ban đầu"
              type="number"
              placeholder="0"
              value={form.balance}
              onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
              error={errors.balance}
              min={0}
            />
          </div>
          <div className={styles.formField} style={{ flex: 1 }}>
            <label className={styles.formLabel}>Đơn vị</label>
            <select
              className={styles.select}
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Màu sắc</label>
          <div className={styles.colorPicker}>
            {WALLET_COLORS.map(color => (
              <button
                key={color}
                className={`${styles.colorSwatch} ${form.color === color ? styles.colorSwatchActive : ''}`}
                style={{ background: color }}
                onClick={() => setForm(f => ({ ...f, color }))}
                type="button"
              >
                {form.color === color && <Check size={12} color="white" />}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={closeModal}>
            <X size={15} /> Hủy
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Check size={15} /> {editId ? 'Lưu thay đổi' : 'Tạo ví'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        title="Xóa ví?"
        description="Hành động này không thể hoàn tác. Tất cả giao dịch liên quan đến ví này cũng sẽ bị xóa."
      >
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            <X size={15} /> Hủy
          </Button>
          <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
            <Trash2 size={15} /> Xóa ví
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
