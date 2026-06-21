import express from 'express'
import cors from 'cors'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { TOOLS } from './tools.js'

// Load .env from project root (parent of server/)
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const app = express()
const PORT = process.env.PORT || 3001

// ── Validate required env vars ─────────────────────────────────────────────────
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

// ── Supabase Client (browser-facing, anon key) ────────────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
)

// ── Groq Client ────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.VITE_GROQ_API_KEY })
console.log('✅ Groq API key loaded:', process.env.VITE_GROQ_API_KEY.slice(0, 8) + '...')

// ── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là trợ lý AI của ứng dụng quản lý tài chính Monexa, bằng tiếng Việt.

## NGUYÊN TẮC QUAN TRỌNG NHẤT: LUÔN DÙNG TOOL
Bạn có quyền gọi các tool (hàm) để đọc và ghi dữ liệu thực tế của người dùng.
Khi người dùng nói về TIỀN BẠC → phải dùng tool, KHÔNG đoán.

## VỀ MONEXA
Monexa là app quản lý chi tiêu cá nhân. Các bảng dữ liệu:
- wallets: ví tiền (cash, bank, e-wallet)
- transactions: giao dịch (income/expense), có category, amount, date, wallet_id
- budgets: ngân sách theo danh mục (monthly/weekly)
- savings_goals: mục tiêu tiết kiệm (name, target_amount, current_amount, deadline)

## KHI NÀO PHẢI GỌI TOOL

| Người dùng nói | Tool cần gọi |
|---|---|
| "Chi X tiền cho Y" | create_transaction |
| "Thu được X" | create_transaction (type=income) |
| "Xem ví" / "có những ví nào" | get_wallets |
| "Tạo ví mới" | create_wallet |
| "Chi tiêu tháng này" / "tháng này tôi chi bao nhiêu" | get_monthly_summary |
| "Xem giao dịch gần đây" | get_transactions |
| "Đặt ngân sách X cho Y" | create_budget |
| "Xem ngân sách" | get_budgets |
| "Tạo mục tiêu tiết kiệm" | create_savings_goal |
| "Xem mục tiêu tiết kiệm" | get_savings_goals |

## QUY TẮC PHẢN HỒI
1. LUÔN trả lời TIẾNG VIỆT
2. Khi dùng tool → CHỜ kết quả rồi THÔNG BÁO thành công bằng tiếng Việt tự nhiên
3. Nếu tool thất bại → nói lỗi bằng tiếng Việt, đề xuất cách sửa
4. Khi cần wallet_id mà chưa biết → gọi get_wallets TRƯỚC rồi hỏi người dùng chọn ví
5. KHÔNG BAO GIỜ bịa số liệu — dùng tool để lấy dữ liệu thực
6. Số tiền luôn format: 1.500.000₫ (dùng . 作为千位分隔符)

## VÍ DỤ TOOL CALLS

User: "Chi 200k ăn trưa hôm nay"
Assistant gọi tool:
{"name": "get_wallets", "parameters": {}}
→ Sau đó hỏi: "Bạn muốn ghi vào ví nào? [Tiền mặt | Ví Techcombank]"
Hoặc user đã chỉ định → gọi create_transaction luôn

User: "Tháng này tôi chi bao nhiêu?"
Assistant gọi:
{"name": "get_monthly_summary", "parameters": {"year": 2026, "month": 6}}
→ Trả lời: "Tháng 6 bạn đã chi 4.250.000₫, thu 28.000.000₫. Top chi tiêu: Ăn uống 1.8M, Di chuyển 800k."

User: "Tạo ví ngân hàng VietinBank"
Assistant gọi:
{"name": "create_wallet", "parameters": {"name": "VietinBank", "type": "bank", "balance": 0}}

## HẠN CHẾ
- Mỗi response CHỈ gọi TỐI ĐA 2 tool calls
- Nếu cần tạo transaction → phải có wallet_id, luôn hỏi nếu user không chỉ định
- Nếu dữ liệu trống → thông báo và gợi ý hành động`

// ── Helper: Build Groq tools format ──────────────────────────────────────────
function buildGroqTools() {
  return TOOLS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

// ── Helper: Execute a tool by name ─────────────────────────────────────────────
async function executeTool(name, ctx, args) {
  const tool = TOOLS.find(t => t.name === name)
  if (!tool) return { success: false, error: `Unknown tool: ${name}` }
  return tool.execute(ctx, args)
}

// ── Helper: Log tool call to DB ────────────────────────────────────────────────
async function logToolCall(userId, toolName, args, result) {
  try {
    const { createClient: createSvc } = await import('@supabase/supabase-js')
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!svcKey) return
    const svc = createSvc(process.env.VITE_SUPABASE_URL, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await svc.from('chat_tool_calls').insert({
      user_id: userId,
      tool_name: toolName,
      tool_args: args,
      result: result,
    })
  } catch {
    // non-fatal
  }
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, user_id, conversation_history = [] } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const ctx = { user_id }

  // Build messages for Groq
  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversation_history.slice(-12).map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ]

  try {
    // Step 1: Initial Groq call — ask if tools are needed
    let response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      tools: buildGroqTools(),
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 2048,
    })

    let assistantMsg = response.choices[0]?.message
    const toolCalls = assistantMsg?.tool_calls ?? []

    // Step 2: Execute all tool calls
    const toolResults = {}
    for (const call of toolCalls) {
      const args = call.function?.arguments
        ? JSON.parse(call.function.arguments)
        : {}
      const result = await executeTool(call.function?.name ?? '', ctx, args)
      toolResults[call.function?.name ?? ''] = result
      // Log to DB
      await logToolCall(user_id, call.function?.name ?? '', args, result)
    }

    // Step 3: If tools were called, add results + final response
    if (toolCalls.length > 0) {
      // Add assistant's tool call message
      groqMessages.push(assistantMsg)

      // Add tool result messages
      for (const call of toolCalls) {
        const name = call.function?.name ?? ''
        const result = toolResults[name]
        groqMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }

      // Step 4: Final Groq call — produce natural language response
      response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      })
    }

    // Stream the response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let fullContent = ''

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) {
        fullContent += delta
        res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      }
    }

    // Save to Supabase chat history
    try {
      await supabase.from('chat_history').insert([
        { user_id, role: 'user', content: message },
        { user_id, role: 'assistant', content: fullContent },
      ])
    } catch (dbErr) {
      console.warn('⚠️  Failed to save chat history:', dbErr)
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
    tools_count: TOOLS.length,
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`\n🚀 Monexa AI Server (Function Calling)`)
  console.log(`   http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   Tools:  ${TOOLS.length} available\n`)
})
