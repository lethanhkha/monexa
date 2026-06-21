import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, RefreshCw, Trash2 } from 'lucide-react'
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

const WELCOME_MSG = 'Xin chào! Mình là trợ lý AI của Monexa. Bạn có thể hỏi về chi tiêu hôm nay, thu nhập, ngân sách, hoặc mô tả một giao dịch — mình sẽ ghi nhận và tư vấn cho bạn nhé! 💰'

const QUICK_ACTIONS = [
  'Chi 200k ăn trưa hôm nay',
  'Thu 28 triệu lương tháng này',
  'Xem tổng chi tiêu tháng này',
  'Mình đã chi bao nhiêu cho ăn uống?',
]

function TypingDots() {
  return (
    <div className={styles.typingDots}>
      <span /><span /><span />
    </div>
  )
}

function renderContent(text: string) {
  const lines = text.split('\n')
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

export function Chatbot() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

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
      .then(({ data: historyData, error: historyErr }) => {
        if (cancelled) return
        if (historyErr) {
          console.error('Failed to load chat history:', historyErr)
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: WELCOME_MSG,
            created_at: new Date().toISOString(),
          }])
          return
        }
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

    const conversationHistory = messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          user_id: user.id,
          conversation_history: conversationHistory,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`Lỗi server: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      const assistantId = crypto.randomUUID()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

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
                } else {
                  updated.push({
                    id: assistantId,
                    role: 'assistant',
                    content: fullContent,
                    created_at: new Date().toISOString(),
                  })
                }
                return updated
              })
            }
            if (parsed.done) break
          } catch {
            // skip malformed
          }
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
  }, [input, loading, user, messages])

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
          <div
            key={msg.id}
            className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}
          >
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

        {/* Streaming content bubble */}
        {loading && streamingContent && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={`${styles.avatar} ${styles.avatarAI}`}>
              <Bot size={13} />
            </div>
            <div className={`${styles.bubble} ${styles.bubbleAI} ${styles.bubbleStreaming}`}>
              {renderContent(streamingContent)}
              <span className={styles.cursor} />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && !streamingContent && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={`${styles.avatar} ${styles.avatarAI}`}>
              <Bot size={13} />
            </div>
            <div className={`${styles.bubble} ${styles.bubbleAI}`}>
              <TypingDots />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!loading && userMsgCount === 0 && (
          <div className={styles.quickActions}>
            <p className={styles.quickLabel}>Gợi ý:</p>
            <div className={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  className={styles.quickBtn}
                  onClick={() => handleSend(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
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
