-- 작업후기 테이블 + 이미지 스토리지 (SQL Editor에서 실행)

CREATE TABLE IF NOT EXISTS public.work_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  work_date DATE,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view work_reviews"
  ON public.work_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert work_reviews"
  ON public.work_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update work_reviews"
  ON public.work_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete work_reviews"
  ON public.work_reviews FOR DELETE TO authenticated USING (true);

GRANT ALL ON TABLE public.work_reviews TO authenticated;

CREATE TRIGGER update_work_reviews_updated_at
  BEFORE UPDATE ON public.work_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.work_reviews REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_reviews;

-- Storage bucket for review photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload review photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos');

CREATE POLICY "Anyone can view review photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "Authenticated can delete review photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos');
