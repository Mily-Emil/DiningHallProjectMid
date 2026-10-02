-- ROLES
CREATE TYPE public.app_role AS ENUM ('student', 'staff', 'admin');
CREATE TYPE public.meal_session AS ENUM ('sarapan', 'makan_siang', 'makan_malam');
CREATE TYPE public.scan_status AS ENUM ('accepted', 'rejected', 'manual');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reg_number text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  dorm text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SESSION SCHEDULE
CREATE TABLE public.session_schedule (
  session public.meal_session PRIMARY KEY,
  label text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL
);
GRANT SELECT ON public.session_schedule TO authenticated, anon;
GRANT ALL ON public.session_schedule TO service_role;
ALTER TABLE public.session_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule readable" ON public.session_schedule FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.session_schedule (session, label, start_time, end_time) VALUES
  ('sarapan', 'Sarapan', '06:00', '08:00'),
  ('makan_siang', 'Makan Siang', '12:00', '14:00'),
  ('makan_malam', 'Makan Malam', '18:00', '20:00');

-- DYNAMIC QR TOKENS
CREATE TABLE public.qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX qr_tokens_student_idx ON public.qr_tokens (student_id, issued_at DESC);
GRANT SELECT ON public.qr_tokens TO authenticated;
GRANT ALL ON public.qr_tokens TO service_role;
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens read" ON public.qr_tokens FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- ATTENDANCE LOG
CREATE TABLE public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reg_number text,
  session public.meal_session NOT NULL,
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Makassar')::date,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  status public.scan_status NOT NULL,
  reason text,
  staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX attendance_unique_accepted
  ON public.attendance_logs (student_id, session, session_date)
  WHERE status IN ('accepted', 'manual');
CREATE INDEX attendance_session_idx ON public.attendance_logs (session_date, session);
GRANT SELECT ON public.attendance_logs TO authenticated;
GRANT ALL ON public.attendance_logs TO service_role;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student reads own logs" ON public.attendance_logs FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- SIGNUP TRIGGER: create profile + default student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, reg_number, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'reg_number', NEW.id::text),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student'))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();