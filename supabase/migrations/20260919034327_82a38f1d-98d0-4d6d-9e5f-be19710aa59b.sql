ALTER TABLE public.telegram_alert_settings
  ADD COLUMN IF NOT EXISTS sector_lead_days jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mute_scraped_tender boolean NOT NULL DEFAULT false;