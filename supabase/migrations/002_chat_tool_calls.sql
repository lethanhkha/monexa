-- =============================================
-- MONEXA — Migration 002
-- Add chat_tool_calls table for AI action audit log
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_tool_calls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,
  tool_args JSONB,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool calls"
  ON public.chat_tool_calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_tool_calls_user ON public.chat_tool_calls(user_id, created_at DESC);
