
-- 1. Agent Logs table
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  target_url text NOT NULL,
  result_payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent logs" ON public.agent_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent logs" ON public.agent_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent logs" ON public.agent_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 2. AI Insights table
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rfp_id uuid NOT NULL REFERENCES public.rfps(id) ON DELETE CASCADE,
  match_score numeric(5,2) NOT NULL DEFAULT 0,
  winning_strategy_summary text,
  gap_analysis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai insights" ON public.ai_insights
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai insights" ON public.ai_insights
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai insights" ON public.ai_insights
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. User Knowledge Base table
CREATE TABLE public.user_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'case_study',
  content text NOT NULL,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge base" ON public.user_knowledge_base
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge base" ON public.user_knowledge_base
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge base" ON public.user_knowledge_base
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge base" ON public.user_knowledge_base
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-update timestamps
CREATE TRIGGER update_agent_logs_updated_at BEFORE UPDATE ON public.agent_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_knowledge_base_updated_at BEFORE UPDATE ON public.user_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
