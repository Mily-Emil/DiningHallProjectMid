ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'assisted';

DROP INDEX IF EXISTS public.attendance_unique_accepted;
CREATE UNIQUE INDEX attendance_unique_daily ON public.attendance_logs (student_id, session_date) WHERE status <> 'rejected';

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_date date NOT NULL,
  session public.meal_session NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu readable" ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE INDEX menu_items_date_idx ON public.menu_items (menu_date, session);