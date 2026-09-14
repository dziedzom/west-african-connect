ALTER POLICY "Admins can view all bid drafts" ON public.bid_drafts TO authenticated;
ALTER POLICY "Users can delete own bid drafts" ON public.bid_drafts TO authenticated;
ALTER POLICY "Users can insert own bid drafts" ON public.bid_drafts TO authenticated;
ALTER POLICY "Users can update own bid drafts" ON public.bid_drafts TO authenticated;
ALTER POLICY "Users can view own bid drafts" ON public.bid_drafts TO authenticated;
ALTER POLICY "Admins can view all bid reviews" ON public.bid_reviews TO authenticated;
ALTER POLICY "Users can insert own bid reviews" ON public.bid_reviews TO authenticated;
ALTER POLICY "Users can view own bid reviews" ON public.bid_reviews TO authenticated;