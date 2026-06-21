import express from 'express'
import cors from 'cors'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

// ── Supabase Admin Client ───────────────────────────────────────────────────
// Use service role key for server-side operations (chat history)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

// ── Groq Client ──────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là trợ lý AI của ứng dụng quản lý tài chính Monexa.

## VỀ MONEXA
Monexa là app quản lý chi tiêu cá nhân bằng tiếng Việt. Người dùng có thể:
- Theo dõi thu nhập và chi tiêu
- Quản lý nhiều ví (tiền mặt, ngân hàng, ví điện tử)
- Đặt ngân sách theo danh mục (Ăn uống, Di chuyển, Giải trí, Mua sắm, Sức khỏe...)
- Đặt mục tiêu tiết kiệm với deadline

## NGUYÊN TẮC TRẢ LỜI
1. LUÔN trả lời bằng TIẾNG VIỆT
2. Ngắn gọn, thân thiện, dễ hiểu
3. Nếu người dùng mô tả giao dịch, PHẢN HỒI bằng JSON format để app có thể tạo giao dịch:
   - Trả lời bình thường TRƯỚC, sau đó gợi ý tạo giao dịch
   - Nếu đủ thông tin (số tiền, loại thu/chi, danh mục) → trả lời kèm JSON
4. Không bịa đặt số liệu — chỉ phân tích, gợi ý, khuyên nhủ
5. Thể hiện sự đồng cảm với người dùng về tiền bạc

## VÍ DỤ PHẢN HỒI KHI NHẬN GIAO DỊCH
Nếu user nói "Chi 150k ăn trưa, ví tiền mặt":
→ Phản hồi: "Đã ghi nhận giao dịch chi tiêu 150.000₫ cho ăn trưa từ ví tiền mặt. Đây là khoản chi tiêu hợp lý. Bạn muốn mình tạo giao dịch này không?"

## VỀ DỮ LIỆU
- Tiền tệ: VND (₫) hoặc USD ($)
- Các danh mục chi tiêu: Ăn uống, Di chuyển, Mua sắm, Giải trí, Sức khỏe, Nhà cửa, Hóa đơn, Khác
- Các danh mục thu nhập: Lương, Thưởng, Đầu tư, Phụ cấp, Khác`

// ── Chat Endpoint ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, user_id, conversation_history = [] } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Build messages for Groq
    const groqMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation_history.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    // Stream response from Groq
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    })

    // Set SSE headers
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
      await supabaseAdmin.from('chat_history').insert([
        { user_id, role: 'user', content: message },
        { user_id, role: 'assistant', content: fullContent },
      ])
    } catch (dbErr) {
      console.error('Failed to save chat history:', dbErr)
      // Non-fatal — don't fail the request
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    console.error('Groq error:', err)
    res.status(500).json({ error: 'Lỗi khi gọi AI. Vui lòng thử lại.' })
  }
})

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`✅ Monexa AI Server running on http://localhost:${PORT}`)
})
