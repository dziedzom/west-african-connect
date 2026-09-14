CREATE POLICY "Users can update their own bid reviews"
ON public.bid_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bid reviews"
ON public.bid_reviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai insights"
ON public.ai_insights FOR DELETE TO authenticated
USING (auth.uid() = user_id);