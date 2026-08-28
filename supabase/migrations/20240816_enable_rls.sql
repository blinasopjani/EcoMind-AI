-- =============================================================================
-- EcoMind AI+ — Row Level Security (RLS) Migration
-- Run this in the Supabase SQL editor (dashboard → SQL Editor → New Query)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS TABLE
--    The `id` column must equal `auth.uid()` (Supabase Auth UUID).
--    After migrating to Supabase Auth signUp, new rows in `users` will use
--    the Auth UUID as the primary key, so RLS can rely on auth.uid() = id.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "users_allow_all" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- Users can only read their own row
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update only their own row
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own row (called during signUp)
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- No one (including the anon key) can delete user rows directly
-- (deletion is managed server-side / via admin actions only)

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DEVICES TABLE
--    Devices belong to a user via the `user_id` FK column.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devices_allow_all" ON public.devices;

CREATE POLICY "devices_select_own"
  ON public.devices
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "devices_insert_own"
  ON public.devices
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "devices_update_own"
  ON public.devices
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "devices_delete_own"
  ON public.devices
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BILLS TABLE
--    Bills belong to a user via the `user_id` FK column.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bills_allow_all" ON public.bills;

CREATE POLICY "bills_select_own"
  ON public.bills
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "bills_insert_own"
  ON public.bills
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "bills_update_own"
  ON public.bills
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "bills_delete_own"
  ON public.bills
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. (OPTIONAL) Remove the plain-text `password` column from users table
--    Only run this AFTER you have confirmed that all users have been migrated
--    to Supabase Auth (i.e., no one is still logging in via the old flow).
-- ─────────────────────────────────────────────────────────────────────────────

-- ALTER TABLE public.users DROP COLUMN IF EXISTS password;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification queries — run after applying policies to confirm they work
-- ─────────────────────────────────────────────────────────────────────────────

-- These should return empty sets when executed with the anon role:
--   SELECT * FROM public.users;         -- should be denied / empty
--   SELECT * FROM public.devices;       -- should be denied / empty
--   SELECT * FROM public.bills;         -- should be denied / empty
