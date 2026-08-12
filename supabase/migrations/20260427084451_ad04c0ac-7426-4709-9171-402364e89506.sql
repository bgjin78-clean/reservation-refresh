-- amount column on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;

-- link revenues back to appointment for sync
ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS appointment_id UUID;

CREATE INDEX IF NOT EXISTS idx_revenues_appointment_id ON public.revenues(appointment_id);

-- Sync trigger: when appointment becomes 'completed' with amount > 0, ensure a revenue row exists.
-- When status leaves 'completed' or appointment is deleted, remove the linked revenue row.
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
    -- upsert linked revenue
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