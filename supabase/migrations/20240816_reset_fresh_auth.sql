-- =============================================================================
-- EcoMind AI+ — RESET "nga e para" për Supabase Auth (UUID)
-- =============================================================================
-- KUJDES: Ky skript FSHIN të gjitha të dhënat ekzistuese në users/devices/bills
-- dhe i rikrijon tabelat me id-të UUID të lidhura me Supabase Auth.
-- Ekzekutoje në: Supabase Dashboard -> SQL Editor -> New query -> Paste -> Run.
-- Ekzekuto vetëm KUR ke vendosur të nisësh nga e para (pa ruajtur të dhënat e vjetra).
-- =============================================================================

-- 1) Hiq tabelat e vjetra (integer ids). CASCADE heq edhe FK-të dhe politikat e vjetra.
DROP TABLE IF EXISTS public.bills   CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.users   CASCADE;

-- 2) Rikrijo tabelat me UUID, të lidhura me Supabase Auth (auth.users).
CREATE TABLE public.users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  email      text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.devices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            text,
  type            text,
  avg_consumption double precision,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE public.bills (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount     double precision,
  kwh        double precision,
  date       text,
  provider   text,
  suggestion text,
  created_at timestamptz DEFAULT now()
);

-- 3) Aktivizo Row Level Security.
ALTER TABLE public.users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills   ENABLE ROW LEVEL SECURITY;

-- 4) Politikat: secili sheh/ndryshon vetëm rreshtat e vet (auth.uid()).
-- users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- devices
CREATE POLICY "devices_select_own" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "devices_insert_own" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "devices_update_own" ON public.devices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "devices_delete_own" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- bills
CREATE POLICY "bills_select_own" ON public.bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bills_insert_own" ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bills_update_own" ON public.bills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bills_delete_own" ON public.bills FOR DELETE USING (auth.uid() = user_id);

-- 5) Trigger: krijo automatikisht rreshtin në public.users kur regjistrohet një
--    përdorues i ri në Supabase Auth. Kjo e bën fluksin të sigurt pavarësisht
--    nëse konfirmimi me email është i ndezur apo jo (ekzekuton si SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, created_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Pas ekzekutimit:
--   - Sigurohu që Authentication -> Providers -> Email -> "Confirm email" është OFF
--     (për regjistrim/hyrje të menjëhershme gjatë testimit).
--   - Regjistro një llogari të re nga aplikacioni dhe testo hyrjen.
-- =============================================================================
