CREATE TABLE public.telegram_alert_settings (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  chat_id text,
  min_days_to_deadline integer NOT NULL DEFAULT 14,
  priority_sectors text[] NOT NULL DEFAULT ARRAY['Marketing','Consulting','IT','Construction','Health','Education','Energy']::text[],
  send_unknown_deadline boolean NOT NULL DEFAULT false,
  mute_prospect_match boolean NOT NULL DEFAULT false,
  mute_priority_sector boolean NOT NULL DEFAULT false,
  mute_candidate_portal boolean NOT NULL DEFAULT false,
  mute_scraper_alerts boolean NOT NULL DEFAULT false,
  max_messages_per_run integer NOT NULL DEFAULT 12,
  admin_base_url text NOT NULL DEFAULT 'https://www.middlbrand.com',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_alert_settings_single_row CHECK (id = true)
);

GRANT SELECT ON public.telegram_alert_settings TO authenticated;
GRANT ALL ON public.telegram_alert_settings TO service_role;
ALTER TABLE public.telegram_alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read telegram settings"
  ON public.telegram_alert_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_telegram_alert_settings_updated_at
  BEFORE UPDATE ON public.telegram_alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.telegram_alert_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.telegram_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  alert_key text NOT NULL,
  chat_id text,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX telegram_alert_log_key_unique
  ON public.telegram_alert_log (category, alert_key) WHERE status = 'sent';
CREATE INDEX telegram_alert_log_created_idx ON public.telegram_alert_log (created_at DESC);

GRANT SELECT ON public.telegram_alert_log TO authenticated;
GRANT ALL ON public.telegram_alert_log TO service_role;
ALTER TABLE public.telegram_alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read telegram alert log"
  ON public.telegram_alert_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));