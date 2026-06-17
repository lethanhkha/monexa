import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Wallet as WalletIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import styles from './WalletsPage.module.css'

const mockWallets = [
  { id: '1', name: 'Tiền mặt', type: 'cash', balance: 3_500_000, currency: 'VND', color: '#10B981' },
  { id: '2', name: 'TPBank', type: 'bank', balance: 8_250_000, currency: 'VND', color: '#38BDF8' },
  { id: '3', name: 'MoMo', type: 'e-wallet', balance: 2_000_000, currency: 'VND', color: '#A855F7' },
  { id: '4', name: 'PayPal', type: 'e-wallet', balance: 150, currency: 'USD', color: '#F59E0B' },
]

const typeLabels = { cash: 'Tiền mặt', bank: 'Ngân hàng', 'e-wallet': 'Ví điện tử' }

export function WalletsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Ví của tôi</h1>
        <button className={styles.addBtn}>
          <Plus size={16} /> Thêm ví mới
        </button>
      </div>

      <div className={styles.walletsGrid}>
        {mockWallets.map(wallet => (
          <Card key={wallet.id} className={styles.walletCard}>
            <div className={styles.walletTop}>
              <div className={styles.walletIcon} style={{ background: `${wallet.color}20`, borderColor: `${wallet.color}40` }}>
                <WalletIcon size={20} color={wallet.color} />
              </div>
              <div className={styles.walletActions}>
                <button className={styles.iconBtn}><Pencil size={14} /></button>
                <button className={`${styles.iconBtn} ${styles.danger}`}><Trash2 size={14} /></button>
              </div>
            </div>
            <h3 className={styles.walletName}>{wallet.name}</h3>
            <Badge variant="default">{typeLabels[wallet.type]}</Badge>
            <p className={styles.walletBalance} style={{ color: wallet.color }}>
              {formatCurrency(wallet.balance, wallet.currency as 'VND' | 'USD')}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
