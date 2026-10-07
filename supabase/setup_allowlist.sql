-- 승인 계정만 접근 + 관리자 2명 설정 + 그 외 Auth 사용자 삭제
-- Supabase SQL Editor에서 실행

-- 1) 허용 이메일 검사 함수
CREATE OR REPLACE FUNCTION public.is_allowed_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN (
    'jjubu10@gmail.com',
    'bg.jin78@gmail.com'
  );
$$;

-- 2) 가입 시 역할: 두 계정만 admin, 그 외는 역할 부여 안 함(접근 차단)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IN ('jjubu10@gmail.com', 'bg.jin78@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) 기존 두 계정 admin 보장
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) IN ('jjubu10@gmail.com', 'bg.jin78@gmail.com')
ON CONFLICT DO NOTHING;

-- 4) appointments RLS → 허용 계정만
DROP POLICY IF EXISTS "Authenticated can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated can delete appointments" ON public.appointments;

CREATE POLICY "Allowed can view appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_allowed_user());
CREATE POLICY "Allowed can insert appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_allowed_user());
CREATE POLICY "Allowed can update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_allowed_user()) WITH CHECK (public.is_allowed_user());
CREATE POLICY "Allowed can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.is_allowed_user());

-- 5) revenues RLS
DROP POLICY IF EXISTS "Authenticated can view revenues" ON public.revenues;
DROP POLICY IF EXISTS "Authenticated can insert revenues" ON public.revenues;
DROP POLICY IF EXISTS "Authenticated can update revenues" ON public.revenues;
DROP POLICY IF EXISTS "Authenticated can delete revenues" ON public.revenues;

CREATE POLICY "Allowed can view revenues"
  ON public.revenues FOR SELECT TO authenticated
  USING (public.is_allowed_user());
CREATE POLICY "Allowed can insert revenues"
  ON public.revenues FOR INSERT TO authenticated
  WITH CHECK (public.is_allowed_user());
CREATE POLICY "Allowed can update revenues"
  ON public.revenues FOR UPDATE TO authenticated
  USING (public.is_allowed_user()) WITH CHECK (public.is_allowed_user());
CREATE POLICY "Allowed can delete revenues"
  ON public.revenues FOR DELETE TO authenticated
  USING (public.is_allowed_user());

-- 6) work_reviews RLS
DROP POLICY IF EXISTS "Authenticated can view work_reviews" ON public.work_reviews;
DROP POLICY IF EXISTS "Authenticated can insert work_reviews" ON public.work_reviews;
DROP POLICY IF EXISTS "Authenticated can update work_reviews" ON public.work_reviews;
DROP POLICY IF EXISTS "Authenticated can delete work_reviews" ON public.work_reviews;

CREATE POLICY "Allowed can view work_reviews"
  ON public.work_reviews FOR SELECT TO authenticated
  USING (public.is_allowed_user());
CREATE POLICY "Allowed can insert work_reviews"
  ON public.work_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_allowed_user());
CREATE POLICY "Allowed can update work_reviews"
  ON public.work_reviews FOR UPDATE TO authenticated
  USING (public.is_allowed_user()) WITH CHECK (public.is_allowed_user());
CREATE POLICY "Allowed can delete work_reviews"
  ON public.work_reviews FOR DELETE TO authenticated
  USING (public.is_allowed_user());

-- 7) 스토리지 업로드/삭제도 허용 계정만
DROP POLICY IF EXISTS "Authenticated can upload review photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete review photos" ON storage.objects;

CREATE POLICY "Allowed can upload review photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos' AND public.is_allowed_user());
CREATE POLICY "Allowed can delete review photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND public.is_allowed_user());

-- 8) 승인되지 않은 Auth 사용자 삭제 (두 계정만 남김)
DELETE FROM auth.users
WHERE lower(email) NOT IN ('jjubu10@gmail.com', 'bg.jin78@gmail.com');
