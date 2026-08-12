-- 리프레시홈 DB 초기 설정 (한 번에 실행)
-- Supabase SQL Editor에 붙여넣고 Run 클릭

-- 1. Roles enum & user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Auto-assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'jjubu10@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.user_roles (user_id, role)
SELECT id, CASE WHEN email = 'jjubu10@gmail.com' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END
FROM auth.users
ON CONFLICT DO NOTHING;

-- 3. Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  region TEXT NOT NULL DEFAULT '경남',
  amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view appointments"
  ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointments"
  ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update appointments"
  ON public.appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete appointments"
  ON public.appointments FOR DELETE TO authenticated USING (true);

-- 4. Revenues
CREATE TABLE public.revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '경남',
  appointment_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view revenues"
  ON public.revenues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert revenues"
  ON public.revenues FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update revenues"
  ON public.revenues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete revenues"
  ON public.revenues FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_revenues_appointment_id ON public.revenues(appointment_id);

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON public.revenues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.revenues REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenues;

-- 7. 완료 일정 → 매출 자동 연동
CREATE OR REPLACE FUNCTION public.sync_appointment_revenue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.revenues WHERE appointment_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'completed' AND COALESCE(NEW.amount, 0) > 0 THEN
    IF EXISTS (SELECT 1 FROM public.revenues WHERE appointment_id = NEW.id) THEN
      UPDATE public.revenues
      SET date = NEW.date,
          amount = NEW.amount,
          customer_name = NEW.customer_name,
          service = NEW.service,
          notes = NEW.notes,
          region = NEW.region
      WHERE appointment_id = NEW.id;
    ELSE
      INSERT INTO public.revenues (date, amount, customer_name, service, payment_method, notes, region, created_by, appointment_id)
      VALUES (NEW.date, NEW.amount, NEW.customer_name, NEW.service, 'card', NEW.notes, NEW.region, NEW.created_by, NEW.id);
    END IF;
  ELSE
    DELETE FROM public.revenues WHERE appointment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_appointment_revenue_iud ON public.appointments;
CREATE TRIGGER trg_sync_appointment_revenue_iud
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_appointment_revenue();

-- 권한
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.appointments TO authenticated;
GRANT ALL ON TABLE public.revenues TO authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
