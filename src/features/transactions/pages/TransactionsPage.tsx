import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input } from '@/components/ui'
import { Plus, Filter, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import styles from './TransactionsPage.module.css'

const mockTransactions = [
  { id: '1', type: 'expense', amount: 85000, category: 'Ăn uống', note: 'Cơm trưa công ty', wallet: 'Tiền mặt', date: new Date().toISOString() },
  { id: '2', type: 'income', amount: 28000000, category: 'Lương', note: 'Lương tháng 6', wallet: 'TPBank', date: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', type: 'expense', amount: 450000, category: 'Di chuyển', note: 'Grab đi làm', wallet: 'MoMo', date: new Date(Date.now() - 172800000).toISOString() },
  { id: '4', type: 'expense', amount: 320000, category: 'Mua sắm', note: 'Tạp hóa', wallet: 'Tiền mặt', date: new Date(Date.now() - 259200000).toISOString() },
  { id: '5', type: 'expense', amount: 150000, category: 'Giải trí', note: 'Netflix', wallet: 'MoMo', date: new Date(Date.now() - 345600000).toISOString() },
]

export function TransactionsPage() {
  const [search, setSearch] = useState('')

  const filtered = mockTransactions.filter(tx =>
    tx.category.toLowerCase().includes(search.toLowerCase()) ||
    tx.note.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Giao dịch</h1>
        <Button><Plus size={16} /> Thêm giao dịch</Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button className={styles.filterBtn}>
          <Filter size={16} /> Bộ lọc
        </button>
      </div>

      <Card>
        <CardContent>
          <div className={styles.txList}>
            {filtered.map(tx => (
              <div key={tx.id} className={styles.txItem}>
                <div className={styles.txDot}>
                  <span className={`${styles.dot} ${tx.type === 'income' ? styles.dotIncome : styles.dotExpense}`} />
                </div>
                <div className={styles.txInfo}>
                  <p className={styles.txCategory}>{tx.category}</p>
                  <p className={styles.txNote}>{tx.note} · {tx.wallet} · {formatDate(tx.date)}</p>
                </div>
                <p className={`${styles.txAmount} ${tx.type === 'income' ? styles.income : styles.expense}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
