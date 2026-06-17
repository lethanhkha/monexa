import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Wallet, ArrowLeftRight, PiggyBank, TrendingUp, BarChart3, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import styles from './Layout.module.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/wallets', icon: Wallet, label: 'Ví của tôi' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Giao dịch' },
  { to: '/budgets', icon: PiggyBank, label: 'Ngân sách' },
  { to: '/savings', icon: TrendingUp, label: 'Tiết kiệm' },
  { to: '/reports', icon: BarChart3, label: 'Báo cáo' },
]

export function Layout() {
  const { signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.layout}>
      {/* Mobile Header */}
      <header className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu size={20} />
        </button>
        <span className={styles.mobileLogo}>Monexa</span>
      </header>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Monexa</span>
        </div>
        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <button className={styles.signOutBtn} onClick={signOut}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
