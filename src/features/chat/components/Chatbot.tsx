import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import styles from './Chatbot.module.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

const initialMessages: Message[] = [
  {
    id: '0',
    role: 'assistant',
    content: 'Xin chào! Mình là trợ lý AI của Monexa. Hãy nói cho mình biết bạn đã chi tiêu gì hôm nay, mình sẽ tự động tạo giao dịch cho bạn nhé!',
    created_at: new Date().toISOString(),
  },
]

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      })

      const data = await res.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || data.error || 'Mình không hiểu ý bạn. Thử mô tả chi tiết hơn nhé!',
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Xin lỗi, mình đang gặp sự cố. Bạn thử lại sau nhé!',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMessage])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={18} color="var(--primary)" />
          <span className={styles.headerTitle}>Trợ lý AI</span>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}>
            <div className={styles.avatar}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={styles.bubble}>
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistantMsg}`}>
            <div className={styles.avatar}><Bot size={14} /></div>
            <div className={styles.bubble}>
              <p className={styles.typing}>Mình đang xử lý...</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          placeholder="VD: Chi 150k ăn trưa, tiền mặt..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <Button size="sm" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  )
}
