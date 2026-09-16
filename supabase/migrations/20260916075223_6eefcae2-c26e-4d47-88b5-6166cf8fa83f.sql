CREATE POLICY "Admins manage engagement documents storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'engagement-documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'engagement-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients read own engagement document files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'engagement-documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_engagement_client(((storage.foldername(name))[1])::uuid)
  );