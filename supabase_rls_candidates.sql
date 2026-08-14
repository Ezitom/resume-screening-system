-- Idempotent SQL Script: Fix Row-Level Security (RLS) for Candidates and Applications tables
-- Description: Grants INSERT, SELECT, and UPDATE permissions to 'anon' and 'authenticated' roles
-- so unauthenticated applicants can submit applications via the frontend.

-- ============================================================
-- 1. CANDIDATES TABLE RLS POLICIES
-- ============================================================
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist for idempotency
DROP POLICY IF EXISTS "Anyone can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can select candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can update candidates" ON public.candidates;

-- Allow public applicants (anon) and recruiters to submit applications
CREATE POLICY "Anyone can insert candidates"
ON public.candidates
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading candidate records for dashboard and evaluation views
CREATE POLICY "Anyone can select candidates"
ON public.candidates
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow updating candidate records (status updates, shortlisting, rejections)
CREATE POLICY "Anyone can update candidates"
ON public.candidates
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- ============================================================
-- 2. APPLICATIONS TABLE RLS POLICIES
-- ============================================================
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist
DROP POLICY IF EXISTS "Anyone can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Anyone can select applications" ON public.applications;
DROP POLICY IF EXISTS "Anyone can update applications" ON public.applications;

-- Allow inserting applications
CREATE POLICY "Anyone can insert applications"
ON public.applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading applications
CREATE POLICY "Anyone can select applications"
ON public.applications
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow updating applications
CREATE POLICY "Anyone can update applications"
ON public.applications
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
