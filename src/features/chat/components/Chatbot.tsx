import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, RefreshCw, Trash2, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import styles from './Chatbot.module.css'
import toast from 'react-hot-toast'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface PendingWalletChoice {
  /** The message ID of the wallet-picker bubble */
  msgId: string
  /** Already-loaded wallets for quick pick */
  wallets: WalletInfo[]
  /** Raw amount extracted by AI */
  amount: number
  /** Category */
  category: string
  /** Transaction type */
  type: 'income' | 'expense'
  /** Original user message */
  originalMessage: string
}

interface WalletInfo {
  id: string
  name: string
  type: string
  balance: number
}

const WELCOME_MSG =
  'Xin chào! Mình là trợ lý AI của Monexa. Bạn có thể hỏi về chi tiêu hôm nay, thu nhập, ngân sách, hoặc mô tả một giao dịch — mình sẽ ghi nhận và tư vấn cho bạn nhé! 💰'

const QUICK_ACTIONS = [
  'Chi 200k ăn trưa hôm nay',
  'Thu 28 triệu lương tháng này',
  'Xem tổng chi tiêu tháng này',
  'Mình đã chi bao nhiêu cho ăn uống?',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className={styles.typingDots}>
      <span /><span /><span />
    </div>
  )
}

function renderContent(text: string) {
  // Strip any raw function-call JSON artifacts that Groq sometimes emits
  const clean = text.replace(/\{[\s\S]*?"name"\s*:\s*"(get_wallets|create_transaction|create_wallet|create_budget|get_budgets|create_savings_goal|get_savings_goals|get_monthly_summary|get_transactions)"[\s\S]*?\}/g, '')
  const lines = clean.trim().split('\n')
  return lines.map((line, i) => {
    const parts = line.split(/(`[^`]+`)/g)
    return (
      <p key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={j} className={styles.inlineCode}>{part.slice(1, -1)}</code>
          }
          const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
          return boldParts.map((bp, k) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return <strong key={k}>{bp.slice(2, -2)}</strong>
            }
            return <span key={k}>{bp}</span>
          })
        })}
      </p>
    )
  })
}

// ── Wallet Picker Bubble ────────────────────────────────────────────────────────

interface WalletPickerProps {
  wallets: WalletInfo[]
  category: string
  amount: number
  type: 'income' | 'expense'
  onPick: (walletId: string) => void
  onCancel: () => void
}

function WalletPicker({ wallets, category, amount, type, onPick, onCancel }: WalletPickerProps) {
  const typeLabel = type === 'income' ? 'thu nhập' : 'chi tiêu'
  return (
    <div className={styles.walletPicker}>
      <div className={styles.walletPickerHeader}>
        <Wallet size={13} />
        <span>
          Ghi nhận <strong>{amount.toLocaleString('vi-VN')}₫</strong> ({typeLabel}) cho <strong>{category}</strong>
        </span>
      </div>
      <div className={styles.walletPickerList}>
        {wallets.map(w => (
          <button
            key={w.id}
            className={styles.walletPickerBtn}
            onClick={() => onPick(w.id)}
          >
            <span className={styles.walletPickerName}>{w.name}</span>
            <span className={styles.walletPickerBalance}>
              {w.balance.toLocaleString('vi-VN')}₫
            </span>
          </button>
        ))}
      </div>
      <button className={styles.walletPickerCancel} onClick={onCancel}>
        Hủy
      </button>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function Chatbot() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState(0)
  const [pendingWallet, setPendingWallet] = useState<PendingWalletChoice | null>(null)
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, pendingWallet])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Load wallets
  useEffect(() => {
    if (!user) return
    supabase
      .from('wallets')
      .select('id, name, type, balance')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setWallets(data)
      })
  }, [user])

  // Load history from Supabase
  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .range(0, 49)
      .then(({ data: historyData }) => {
        if (cancelled) return
        if (!historyData || historyData.length === 0) {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: WELCOME_MSG,
            created_at: new Date().toISOString(),
          }])
        } else {
          setMessages(historyData.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            created_at: m.created_at,
          })))
        }
      })

    return () => { cancelled = true }
  }, [user, conversationId])

  // ── Save message to Supabase ──────────────────────────────────────────────
  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!user) return
    await supabase.from('chat_history').insert({ user_id: user.id, role, content })
  }, [user])

  // ── Handle wallet picker pick ──────────────────────────────────────────────
  const handleWalletPick = useCallback(async (walletId: string) => {
    if (!pendingWallet || !user) return

    const { amount, category, type } = pendingWallet
    setPendingWallet(null)
    setLoading(true)

    // Retry with the chosen wallet
    const retryMsg = `Tôi chọn ví có ID: ${walletId}. Giao dịch: ${type} ${amount}₫ cho ${category}.`

    // Save user choice as a synthetic message
    await saveMessage('user', retryMsg)
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: retryMsg,
      created_at: new Date().toISOString(),
    }])

    const conversationHistory = messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: retryMsg,
          user_id: user.id,
          conversation_history: conversationHistory,
        }),
      })

      if (!response.ok) throw new Error(`Lỗi server: ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.delta !== undefined) {
              fullContent += parsed.delta
              setStreamingContent(fullContent)
              setMessages(prev => {
                const last = prev[prev.length - 1]
                if (last?.id === 'streaming') {
                  return [...prev.slice(0, -1), { id: 'streaming', role: 'assistant', content: fullContent, created_at: new Date().toISOString() }]
                }
                return [...prev, { id: 'streaming', role: 'assistant', content: fullContent, created_at: new Date().toISOString() }]
              })
            }
            if (parsed.done) {
              // Save final response
              await saveMessage('assistant', fullContent)
              // Update ID from streaming to permanent
              setMessages(prev => prev.map(m =>
                m.id === 'streaming'
                  ? { ...m, id: crypto.randomUUID() }
                  : m
              ))
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối'
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Xin lỗi, mình gặp sự cố: ${msg}. Thử lại sau nhé!`,
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setStreamingContent('')
    }
  }, [pendingWallet, user, messages, saveMessage])

  // ── Handle wallet picker cancel ───────────────────────────────────────────
  const handleWalletCancel = useCallback(() => {
    setPendingWallet(null)
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    if (!user) {
      toast.error('Vui lòng đăng nhập để sử dụng AI chatbot')
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const abortController = new AbortController()
    abortRef.current = abortController

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    if (!text) setInput('')
    setLoading(true)
    setStreamingContent('')
    setError(null)

    // Save user message immediately (frontend-first)
    await saveMessage('user', content)

    const conversationHistory = messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, user_id: user.id, conversation_history: conversationHistory }),
        signal: abortController.signal,
      })

      if (!response.ok) throw new Error(`Lỗi server: ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      const assistantId = crypto.randomUUID()

      // Add assistant bubble immediately
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.delta !== undefined) {
              fullContent += parsed.delta
              setStreamingContent(fullContent)
              setMessages(prev => {
                const updated = [...prev]
                const lastIdx = updated.length - 1
                if (lastIdx >= 0 && updated[lastIdx].id === assistantId) {
                  updated[lastIdx] = { ...updated[lastIdx], content: fullContent }
                }
                return updated
              })
            }
            if (parsed.done) {
              // ── Detect wallet picker trigger ─────────────────────────────
              // Look for the get_wallets result followed by a "chọn ví" question
              // We parse tool results from the text content (tool info is embedded in response)
              const textLower = fullContent.toLowerCase()
              const asksForWallet = textLower.includes('chọn ví') ||
                textLower.includes('ghi vào ví nào') ||
                textLower.includes('ví nào') ||
                textLower.includes('vào ví') ||
                textLower.includes('chọn 1 ví')

              if (asksForWallet && wallets.length > 0) {
                // Extract amount and category from conversation
                const amountMatch = fullContent.match(/(\d[\d.]+)\s*[kK₫]/)
                const amount = amountMatch
                  ? parseInt(amountMatch[1].replace(/\./g, '')) * (amountMatch[1].includes('k') ? 1000 : 1)
                  : 0
                const categories = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Sức khỏe', 'Hóa đơn', 'Lương', 'Thưởng', 'Khác']
                const category = categories.find(c => textLower.includes(c.toLowerCase())) || 'Khác'
                const type = textLower.includes('thu') || textLower.includes('nhận') ? 'income' : 'expense'

                const msgId = crypto.randomUUID()
                setPendingWallet({ msgId, wallets, amount, category, type, originalMessage: content })
              }

              // Save to DB
              await saveMessage('assistant', fullContent)
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối'
      setError(msg)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Xin lỗi, mình gặp sự cố: ${msg}. Bạn thử lại sau nhé!`,
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setStreamingContent('')
    }
  }, [input, loading, user, messages, wallets, saveMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearHistory = async () => {
    if (!user) return
    if (!confirm('Xóa toàn bộ lịch sử chat?')) return
    const { error: delErr } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', user.id)
    if (delErr) {
      toast.error('Không thể xóa lịch sử')
      return
    }
    setConversationId(id => id + 1)
    toast.success('Đã xóa lịch sử chat')
  }

  const reloadLastResponse = () => {
    const lastAssistant = messages.filter(m => m.role === 'assistant').at(-1)
    if (lastAssistant) handleSend(lastAssistant.content)
  }

  const userMsgCount = messages.filter(m => m.role === 'user').length

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={16} color="var(--primary)" />
          <span className={styles.headerTitle}>Trợ lý AI</span>
          {loading && <div className={styles.headerBadge}>Đang trả lời...</div>}
          {pendingWallet && <div className={styles.headerBadge} style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>Chọn ví</div>}
        </div>
        <div className={styles.headerActions}>
          {error && (
            <button className={styles.headerBtn} onClick={reloadLastResponse} title="Thử lại">
              <RefreshCw size={14} />
            </button>
          )}
          <button className={styles.headerBtn} onClick={clearHistory} title="Xóa lịch sử">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}>
            <div className={`${styles.avatar} ${msg.role === 'user' ? styles.avatarUser : styles.avatarAI}`}>
              {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>
            <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI}`}>
              {msg.role === 'assistant'
                ? renderContent(msg.content)
                : <p>{msg.content}</p>
              }
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {loading && streamingContent && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={`${styles.avatar} ${styles.avatarAI}`}><Bot size={13} /></div>
            <div className={`${styles.bubble} ${styles.bubbleAI} ${styles.bubbleStreaming}`}>
              {renderContent(streamingContent)}
              <span className={styles.cursor} />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && !streamingContent && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={`${styles.avatar} ${styles.avatarAI}`}><Bot size={13} /></div>
            <div className={`${styles.bubble} ${styles.bubbleAI}`}><TypingDots /></div>
          </div>
        )}

        {/* Wallet Picker */}
        {pendingWallet && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={`${styles.avatar} ${styles.avatarAI}`}><Bot size={13} /></div>
            <WalletPicker
              wallets={pendingWallet.wallets}
              category={pendingWallet.category}
              amount={pendingWallet.amount}
              type={pendingWallet.type}
              onPick={handleWalletPick}
              onCancel={handleWalletCancel}
            />
          </div>
        )}

        {/* Quick Actions */}
        {!loading && !pendingWallet && userMsgCount === 0 && (
          <div className={styles.quickActions}>
            <p className={styles.quickLabel}>Gợi ý:</p>
            <div className={styles.quickGrid}>
              {QUICK_ACTIONS.map(action => (
                <button key={action} className={styles.quickBtn} onClick={() => handleSend(action)}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder="Hỏi về chi tiêu, thu nhập, ngân sách..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className={`${styles.sendBtn} ${!input.trim() || loading ? styles.sendBtnDisabled : ''}`}
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          aria-label="Gửi"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
