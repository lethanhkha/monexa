import express from 'express'
import cors from 'cors'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load .env from project root (parent of server/)
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const app = express()
const PORT = process.env.PORT || 3001

// ── Validate required env vars on startup ─────────────────────────────────────
// Match keys exactly as they appear in .env (VITE_ prefix)
const requiredKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_GROQ_API_KEY']
const missingKeys = requiredKeys.filter(k => !process.env[k])
if (missingKeys.length > 0) {
  console.error('❌ Missing required env vars:', missingKeys.join(', '))
  console.error('   Check your .env file at the project root.')
  process.exit(1)
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

// ── Supabase Client ────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// ── Groq Client ────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.VITE_GROQ_API_KEY })
console.log('✅ Groq API key loaded:', process.env.VITE_GROQ_API_KEY.slice(0, 8) + '...')

// ── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là trợ lý AI của ứng dụng quản lý tài chính Monexa, bằng tiếng Việt.

## VỀ MONEXA
Monexa là app quản lý chi tiêu cá nhân. Người dùng có thể:
- Theo dõi thu nhập và chi tiêu theo từng ví (tiền mặt, ngân hàng, ví điện tử)
- Quản lý ngân sách theo danh mục: Ăn uống, Di chuyển, Mua sắm, Giải trí, Sức khỏe, Nhà cửa, Hóa đơn, Khác
- Đặt mục tiêu tiết kiệm với deadline

## CÁCH PHẢN HỒI
1. LUÔN trả lời bằng TIẾNG VIỆT
2. Ngắn gọn, thân thiện, dễ hiểu (dưới 3-5 câu cho câu hỏi đơn giản)
3. Thể hiện sự đồng cảm: "Hiểu rồi, khoản chi tiêu này khá hợp lý!" hoặc "Tháng này chi tiêu hơi nhiều, bạn cân nhắc cắt giảm X nhé."
4. Gợi ý cụ thể, có con số minh họa
5. Nếu người dùng mô tả giao dịch → phản hồi xác nhận: "Đã ghi nhận: chi 150.000₫ cho ăn trưa. Tôi sẽ tạo giao dịch này cho bạn."

## VÍ DỤ PHẢN HỒI
User: "Chi 200k ăn trưa hôm nay"
→ "Đã ghi nhận: chi 200.000₫ cho ăn trưa. Tôi sẽ tạo giao dịch cho bạn ngay!"

User: "Mình chi tiêu nhiều quá tháng này"
→ "Tháng này bạn đã chi khá nhiều rồi. Ăn uống và mua sắm chiếm tỷ trọng lớn nhất. Bạn thử cắt giảm 10-15% ở 2 hạng mục đó xem sao nhé?"

User: "Mình nên tiết kiệm bao nhiêu mỗi tháng?"
→ "Quy tắc 50/30/20 khuyến nghị: 50% nhu cầu thiết yếu, 30% muốn, 20% tiết kiệm. Với thu nhập 28 triệu, bạn nên tiết kiệm khoảng 5.6 triệu/tháng nhé!"`

// ── Chat Endpoint ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, user_id, conversation_history = [] } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversation_history.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ]

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let fullContent = ''

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) {
        fullContent += delta
        res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      }
    }

    // Save to Supabase chat history
    try {
      const { error: saveErr } = await supabase
        .from('chat_history')
        .insert([
          { user_id, role: 'user', content: message },
          { user_id, role: 'assistant', content: fullContent },
        ])
      if (saveErr) console.warn('⚠️  Failed to save chat history:', saveErr.message)
    } catch (dbErr) {
      console.warn('⚠️  DB save error (non-fatal):', dbErr)
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    console.error('❌ Groq error:', err?.message || err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Lỗi khi gọi AI. Vui lòng thử lại.' })
    } else {
      res.end()
    }
  }
})

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    groq_key_loaded: !!process.env.VITE_GROQ_API_KEY,
    supabase_url: !!process.env.VITE_SUPABASE_URL,
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`\n🚀 Monexa AI Server`)
  console.log(`   http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health\n`)
})
