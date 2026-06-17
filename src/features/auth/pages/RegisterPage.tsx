import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from './LoginPage.module.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, fullName)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Tạo tài khoản</h1>
          <p className={styles.subtitle}>Bắt đầu hành trình quản lý tài chính của bạn</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.inputGroup}>
            <div className={styles.inputIcon}><User size={16} /></div>
            <Input
              type="text"
              placeholder="Họ và tên"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputIcon}><Mail size={16} /></div>
            <Input
              type="email"
              placeholder="Email của bạn"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputIcon}><Lock size={16} /></div>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button type="button" className={styles.togglePassword} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputIcon}><Lock size={16} /></div>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" loading={loading} className={styles.submitBtn}>
            Tạo tài khoản
          </Button>
        </form>

        <p className={styles.footer}>
          Đã có tài khoản?{' '}
          <Link to="/login" className={styles.link}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
