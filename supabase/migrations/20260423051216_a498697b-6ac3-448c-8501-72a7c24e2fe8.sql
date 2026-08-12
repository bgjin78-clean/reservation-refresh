
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.revenues REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenues;
