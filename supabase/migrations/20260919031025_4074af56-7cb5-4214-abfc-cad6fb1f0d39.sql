GRANT UPDATE ON public.telegram_alert_settings TO authenticated;
CREATE POLICY "Admins can update telegram settings"
  ON public.telegram_alert_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));