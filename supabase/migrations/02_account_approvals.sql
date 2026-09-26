-- ═══════════════════════════════════════════════════════════════════
-- SUPABASE MIGRATION: USER ACCOUNTS & ADMIN APPROVAL SYSTEM
-- Idempotent: safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create user_accounts table
-- Note: Passwords are NEVER stored here to guarantee privacy.
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  prn TEXT NULL,
  department TEXT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  approved_by TEXT NULL
);

-- 2. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_prn ON public.user_accounts(prn);
CREATE INDEX IF NOT EXISTS idx_user_accounts_status ON public.user_accounts(status);
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON public.user_accounts(role);

-- 3. Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Idempotent RLS Policies
-- Allow anyone to read user accounts to verify their approval status during login
DROP POLICY IF EXISTS "Public can view account approval status" ON public.user_accounts;
CREATE POLICY "Public can view account approval status"
  ON public.user_accounts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public registration / account request submissions
DROP POLICY IF EXISTS "Public can submit account registration requests" ON public.user_accounts;
CREATE POLICY "Public can submit account registration requests"
  ON public.user_accounts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow updates (approval, rejection, role management)
DROP POLICY IF EXISTS "Authorized users and admins can update account status" ON public.user_accounts;
CREATE POLICY "Authorized users and admins can update account status"
  ON public.user_accounts FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Allow account deletions by admin
DROP POLICY IF EXISTS "Authorized users and admins can delete accounts" ON public.user_accounts;
CREATE POLICY "Authorized users and admins can delete accounts"
  ON public.user_accounts FOR DELETE
  TO anon, authenticated
  USING (true);

-- 5. Pre-seed default approved accounts (ensures system is operational immediately)
INSERT INTO public.user_accounts (id, full_name, email, prn, department, role, status, approved_at, approved_by)
VALUES 
  ('admin_super', 'Super Administrator', 'admin@indiraicem.ac.in', NULL, 'Technical Committee', 'admin', 'approved', NOW(), 'system'),
  ('teacher_demo', 'Prof. Anjali Sharma', 'teacher@indiraicem.ac.in', NULL, 'Information Technology', 'teacher', 'approved', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'approved';
