
-- Revoke broad UPDATE on agent_logs from authenticated role
REVOKE UPDATE ON public.agent_logs FROM authenticated;

-- Grant UPDATE only on the status column
GRANT UPDATE (status) ON public.agent_logs TO authenticated;
