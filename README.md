# Monexa

Calm, encouraging, goal-oriented — your money, your peace of mind.

Monexa is an AI-powered personal finance management web app built with React, TypeScript, and Supabase. Track expenses, manage budgets, set savings goals, and get intelligent insights — all through a friendly AI chatbot.

## Features

- **AI Chatbot** — Log transactions in natural language. Just say "Spent 200k on lunch today" and Monexa creates the entry automatically.
- **Multi-wallet Management** — Cash, bank accounts, e-wallets with real-time balance tracking.
- **Budget Alerts** — Set monthly spending limits per category. Get notified at 80% threshold.
- **Savings Goals** — Track progress toward savings targets with daily/monthly breakdown.
- **Visual Reports** — Pie charts by category, bar charts by time period.
- **Multi-currency** — Support for VND and USD.

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 18 + TypeScript + Vite                   |
| Backend    | Supabase (Auth, Database, Realtime)            |
| AI         | Gemini / Groq (NLP transaction parsing)        |
| Styling    | CSS Variables + Radix UI (BudgetZen design)   |
| Deployment | Vercel (Frontend) + Supabase (Backend)        |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Supabase project
- API keys: Groq or Gemini

### Environment Setup

```bash
cp .env.example .env
```

Fill in your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GROQ_API_KEY=your-groq-api-key
```

### Install & Run

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── features/        # Auth, wallets, transactions, budgets, savings, chat
├── hooks/           # Custom React hooks
├── lib/             # Supabase client, AI API utilities
├── pages/           # Route pages
├── styles/          # Global CSS, design tokens
└── types/           # TypeScript interfaces
```

## Design System

Monexa uses the **BudgetZen** design system — soft mints, gentle sky blues, and warm grays to reduce financial anxiety. See [budgetzen-DESIGN.md](https://github.com/lethanhkha/monexa/blob/main/budgetzen-DESIGN.md) for full token specs.

## License

MIT
