/**
 * server/tools.js
 *
 * Định nghĩa tất cả tools (function calls) mà AI có thể gọi.
 * Mỗi tool có:
 *   - name: tên gọi trong Groq API
 *   - description: mô tả bằng tiếng Việt để AI hiểu khi nào nên gọi
 *   - parameters: JSON Schema cho Groq
 *   - execute: hàm thực thi thực tế (đọc/ghi Supabase)
 */

import { createClient } from '@supabase/supabase-js'

// ── Supabase server-side client (bypass RLS for write operations) ──────────────
function createServerClient() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for tool execution')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Types ────────────────────────────────────────────────────────────────────
const ToolContext = { user_id: '' }

// ── Tool: Get User Wallets ───────────────────────────────────────────────────
const get_wallets = {
  name: 'get_wallets',
  description:
    'Lấy danh sách tất cả ví tiền của người dùng hiện tại. Dùng để biết người dùng có những ví nào, ' +
    'số dư bao nhiêu — cần thiết trước khi ghi nhận giao dịch hoặc tạo ví mới.',

  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },

  execute: async () => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('wallets')
      .select('id, name, type, currency, balance, color, icon')
      .order('created_at', { ascending: true })
    if (error) return { success: false, error: error.message }
    const wallets = (data ?? []).map(w => ({
      id: w.id,
      name: w.name,
      type: w.type,
      balance: w.balance,
      formatted_balance: Number(w.balance).toLocaleString('vi-VN') + '₫',
    }))
    return { success: true, data: wallets }
  },
}

// ── Tool: Get Recent Transactions ────────────────────────────────────────────
const get_transactions = {
  name: 'get_transactions',
  description:
    'Lấy danh sách giao dịch gần đây của người dùng. Có thể lọc theo: wallet_id, type (income/expense), ' +
    'category, khoảng ngày (start_date, end_date). Trả về tối đa 50 giao dịch mới nhất. ' +
    'Dùng khi người dùng hỏi về chi tiêu, thu nhập, hoặc muốn xem lịch sử.',

  parameters: {
    type: 'object',
    properties: {
      wallet_id: {
        type: 'string',
        description: "UUID của ví. Để trống nếu muốn xem tất cả ví.",
      },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        description: 'Loại giao dịch: income (thu nhập) hoặc expense (chi tiêu)',
      },
      category: {
        type: 'string',
        description: 'Tên danh mục, ví dụ: "Ăn uống", "Lương", "Di chuyển"',
      },
      start_date: {
        type: 'string',
        description: 'Ngày bắt đầu (YYYY-MM-DD), ví dụ: "2026-06-01"',
      },
      end_date: {
        type: 'string',
        description: 'Ngày kết thúc (YYYY-MM-DD), ví dụ: "2026-06-21"',
      },
      limit: {
        type: 'number',
        description: 'Số giao dịch tối đa trả về (mặc định 50)',
        default: 50,
      },
    },
    required: [],
  },

  execute: async (ctx, args = {}) => {
    const supabase = createServerClient()
    let query = supabase
      .from('transactions')
      .select('id, wallet_id, type, amount, category, note, date, created_at')
      .eq('user_id', ctx.user_id)
      .order('date', { ascending: false })
      .limit(args.limit ?? 50)

    if (args.wallet_id) query = query.eq('wallet_id', args.wallet_id)
    if (args.type) query = query.eq('type', args.type)
    if (args.category) query = query.ilike('category', args.category)
    if (args.start_date) query = query.gte('date', args.start_date)
    if (args.end_date) query = query.lte('date', args.end_date)

    const { data, error } = await query
    if (error) return { success: false, error: error.message }

    // Fetch wallet names for readable output
    const walletIds = [...new Set((data ?? []).map(t => t.wallet_id).filter(Boolean))]
    const { data: wallets } = await supabase
      .from('wallets').select('id, name').in('id', walletIds)
    const walletMap = Object.fromEntries((wallets ?? []).map(w => [w.id, w.name]))

    const enriched = (data ?? []).map(t => ({
      id: t.id,
      wallet_name: walletMap[t.wallet_id] ?? t.wallet_id,
      type: t.type,
      amount: t.amount,
      formatted_amount: Number(t.amount).toLocaleString('vi-VN') + '₫',
      category: t.category,
      note: t.note,
      date: t.date,
    }))

    return { success: true, data: enriched }
  },
}

// ── Tool: Get Monthly Summary ─────────────────────────────────────────────────
const get_monthly_summary = {
  name: 'get_monthly_summary',
  description:
    'Tính tổng thu nhập, chi tiêu và số dư trong một tháng cụ thể. ' +
    'Dùng khi người dùng hỏi "chi tiêu tháng này", "thu nhập tháng 5", ' +
    '"tháng này tôi chi bao nhiêu". Trả về tổng income, tổng expense, và số dư.',

  parameters: {
    type: 'object',
    properties: {
      year: {
        type: 'number',
        description: 'Năm, ví dụ: 2026. Mặc định: năm hiện tại.',
      },
      month: {
        type: 'number',
        description: 'Tháng (1-12). Mặc định: tháng hiện tại.',
      },
    },
    required: [],
  },

  execute: async (ctx, args = {}) => {
    const now = new Date()
    const year = args.year ?? now.getFullYear()
    const month = args.month ?? now.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, category')
      .eq('user_id', ctx.user_id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) return { success: false, error: error.message }

    const income = (data ?? [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = (data ?? [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expenseByCategory = {}
    for (const t of data ?? []) {
      if (t.type === 'expense') {
        expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + Number(t.amount)
      }
    }
    const topCategories = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amount]) => ({ category: cat, amount }))

    return {
      success: true,
      data: {
        year,
        month,
        income,
        expense,
        balance: income - expense,
        transaction_count: data?.length ?? 0,
        top_expense_categories: topCategories,
      },
    }
  },
}

// ── Tool: Create Transaction ─────────────────────────────────────────────────
const create_transaction = {
  name: 'create_transaction',
  description:
    'Ghi nhận một giao dịch thu nhập hoặc chi tiêu. ĐÂY LÀ TOOL QUAN TRỌNG NHẤT — ' +
    'dùng khi người dùng nói "chi X tiền cho Y", "thu được X", "nhận lương X". ' +
    'AI phải trích xuất: amount (số tiền BẰNG SỐ, không phải chữ - ví dụ: 200000 cho "200k" hoặc "200.000đ"), ' +
    'type (income/expense), category (danh mục), note (mô tả), date (ngày, mặc định hôm nay), và wallet_id (ví tiền). ' +
    'wallet_id bắt buộc — nếu người dùng không chỉ định ví cụ thể, phải hỏi họ chọn ví.',

  parameters: {
    type: 'object',
    properties: {
      wallet_id: {
        type: 'string',
        description: 'UUID của ví tiền. BẮT BUỘC.',
      },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        description: 'Loại: income (thu nhập) hoặc expense (chi tiêu). BẮT BUỘC.',
      },
      amount: {
        type: 'number',
        description: 'Số tiền (VNĐ). BẮT BUỘC. Ví dụ: 200000 cho "200k" hoặc "200.000đ".',
      },
      category: {
        type: 'string',
        description:
          'Danh mục. Ví dụ: "Ăn uống", "Di chuyển", "Lương", "Thưởng", "Mua sắm", "Giải trí", "Sức khỏe", "Khác". BẮT BUỘC.',
      },
      note: {
        type: 'string',
        description: 'Ghi chú thêm (tùy chọn). Ví dụ: "ăn trưa ở công ty", "mua sữa".',
      },
      date: {
        type: 'string',
        description: 'Ngày giao dịch (YYYY-MM-DD). Mặc định: hôm nay.',
      },
    },
    required: ['wallet_id', 'type', 'amount', 'category'],
  },

  execute: async (ctx, args) => {
    const supabase = createServerClient()
    const date = args.date ?? new Date().toISOString().split('T')[0]

    // ── Normalize amount: "200k" → 200000, "1.5M" → 1500000 ─────────────────
    let amount = Number(args.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: `Số tiền không hợp lệ: "${args.amount}"` }
    }
    // If amount looks like it was parsed as thousands-only (e.g. 200 for "200k"),
    // detect and correct: if amount < 1000 and user likely used k/M suffix
    const rawStr = String(args.amount).toLowerCase()
    if (rawStr.includes('k')) {
      amount = amount * 1000
    } else if (rawStr.includes('m')) {
      amount = amount * 1000000
    }

    const { data: walletData } = await supabase
      .from('wallets').select('name, balance').eq('id', args.wallet_id).single()

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: ctx.user_id,
        wallet_id: args.wallet_id,
        type: args.type,
        amount,
        category: args.category,
        note: args.note ?? null,
        date,
        currency: 'VND',
      })
      .select('id, type, amount, category, note, date')
      .single()

    if (error) return { success: false, error: error.message }

    const emoji = args.type === 'income' ? '📈' : '📉'
    const walletName = walletData?.name ?? '(ví đã chọn)'
    return {
      success: true,
      data: {
        ...data,
        wallet_name: walletName,
        formatted_amount: amount.toLocaleString('vi-VN') + '₫',
        message: `${emoji} Đã ghi nhận giao dịch thành công vào ví "${walletName}"!`,
      },
    }
  },
}

// ── Tool: Create Wallet ───────────────────────────────────────────────────────
const create_wallet = {
  name: 'create_wallet',
  description:
    'Tạo một ví tiền mới cho người dùng. Dùng khi họ nói "tạo ví", "thêm ví mới", "mở ví ngân hàng". ' +
    'Các loại ví: cash (tiền mặt), bank (ngân hàng), e-wallet (ví điện tử). ' +
    'Mặc định số dư là 0.',

  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Tên ví. Ví dụ: "Ví Techcombank", "Ví MoMo", "Tiền mặt". BẮT BUỘC.',
      },
      type: {
        type: 'string',
        enum: ['cash', 'bank', 'e-wallet'],
        description: 'Loại ví. BẮT BUỘC.',
      },
      balance: {
        type: 'number',
        description: 'Số dư ban đầu (VNĐ). Mặc định: 0.',
        default: 0,
      },
      color: {
        type: 'string',
        description: 'Mã màu hex, ví dụ: "#10B981". Mặc định: "#6366F1".',
      },
    },
    required: ['name', 'type'],
  },

  execute: async (ctx, args) => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id: ctx.user_id,
        name: args.name,
        type: args.type,
        balance: args.balance ?? 0,
        color: args.color ?? '#6366F1',
        currency: 'VND',
      })
      .select('id, name, type, balance, color')
      .single()

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: {
        ...data,
        message: `✅ Đã tạo ví "${args.name}" thành công!`,
      },
    }
  },
}

// ── Tool: Create Budget ───────────────────────────────────────────────────────
const create_budget = {
  name: 'create_budget',
  description:
    'Tạo ngân sách cho một danh mục chi tiêu. Dùng khi người dùng nói ' +
    '"đặt ngân sách X cho Y", "tôi muốn chi tối đa X cho Y tháng này". ' +
    'Trả về ngân sách đã tạo.',

  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Tên danh mục, ví dụ: "Ăn uống", "Di chuyển". BẮT BUỘC.',
      },
      amount: {
        type: 'number',
        description: 'Số tiền ngân sách tối đa (VNĐ). BẮT BUỘC.',
      },
      period: {
        type: 'string',
        enum: ['monthly', 'weekly'],
        description: 'Chu kỳ: monthly (hàng tháng) hoặc weekly (hàng tuần). Mặc định: monthly.',
        default: 'monthly',
      },
      alert_threshold: {
        type: 'number',
        description: 'Cảnh báo khi đạt % nào (0-100). Mặc định: 80.',
        default: 80,
      },
    },
    required: ['category', 'amount'],
  },

  execute: async (ctx, args) => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: ctx.user_id,
        category: args.category,
        amount: args.amount,
        period: args.period ?? 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        alert_threshold: args.alert_threshold ?? 80,
      })
      .select('id, category, amount, period, alert_threshold')
      .single()

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: {
        ...data,
        message: `💰 Đã tạo ngân sách cho "${args.category}": ${args.amount.toLocaleString('vi-VN')}₫`,
      },
    }
  },
}

// ── Tool: Get Budgets ────────────────────────────────────────────────────────
const get_budgets = {
  name: 'get_budgets',
  description:
    'Lấy danh sách ngân sách của người dùng. Dùng khi hỏi về ngân sách, ' +
    '"xem ngân sách tháng này", "đã dùng bao nhiêu trong ngân sách".',

  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },

  execute: async () => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('budgets')
      .select('id, category, amount, period, alert_threshold, start_date, created_at')
      .order('created_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    return { success: true, data: data ?? [] }
  },
}

// ── Tool: Create Savings Goal ────────────────────────────────────────────────
const create_savings_goal = {
  name: 'create_savings_goal',
  description:
    'Tạo mục tiêu tiết kiệm. Dùng khi người dùng nói "tiết kiệm X cho Y", ' +
    '"đặt mục tiêu tiết kiệm", "muốn có X triệu vào ngày Y".',

  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Tên mục tiêu. Ví dụ: "Mua xe máy", "Đi Nhật", "Quỹ dự phòng". BẮT BUỘC.',
      },
      target_amount: {
        type: 'number',
        description: 'Số tiền mục tiêu (VNĐ). BẮT BUỘC.',
      },
      deadline: {
        type: 'string',
        description: 'Ngày deadline (YYYY-MM-DD). Tùy chọn.',
      },
      current_amount: {
        type: 'number',
        description: 'Số tiền đã tiết kiệm ban đầu. Mặc định: 0.',
        default: 0,
      },
    },
    required: ['name', 'target_amount'],
  },

  execute: async (ctx, args) => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        user_id: ctx.user_id,
        name: args.name,
        target_amount: args.target_amount,
        deadline: args.deadline ?? null,
        current_amount: args.current_amount ?? 0,
      })
      .select('id, name, target_amount, current_amount, deadline')
      .single()

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: {
        ...data,
        message: `🎯 Đã tạo mục tiêu tiết kiệm "${args.name}" với số tiền mục tiêu ${args.target_amount.toLocaleString('vi-VN')}₫!`,
      },
    }
  },
}

// ── Tool: Get Savings Goals ─────────────────────────────────────────────────
const get_savings_goals = {
  name: 'get_savings_goals',
  description:
    'Lấy danh sách mục tiêu tiết kiệm của người dùng. Dùng khi hỏi về tiết kiệm, ' +
    '"xem mục tiêu tiết kiệm", "đã tiết kiệm được bao nhiêu".',

  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },

  execute: async () => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('savings_goals')
      .select('id, name, target_amount, current_amount, deadline, color')
      .order('created_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    return { success: true, data: data ?? [] }
  },
}

// ── Export all tools ──────────────────────────────────────────────────────────
export const TOOLS = [
  get_wallets,
  get_transactions,
  get_monthly_summary,
  create_transaction,
  create_wallet,
  create_budget,
  get_budgets,
  create_savings_goal,
  get_savings_goals,
]
