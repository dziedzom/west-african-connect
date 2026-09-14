CREATE POLICY "Owners upload own company documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners read own company documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins read all company documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners delete own company documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1 FROM public.company_verifications v
      WHERE v.user_id = auth.uid() AND v.status IN ('pending', 'verified')
    )
  );
