-- Idempotent SQL Migration: Allow Public (Anon) Access to Open Jobs
-- Description: Enables Row Level Security on the 'jobs' table and allows unauthenticated
-- candidates (anon role) to SELECT job postings where status = 'Open'.
-- Does NOT grant anon access to INSERT, UPDATE, or DELETE, nor SELECT on non-Open jobs.

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 1. Drop policy if it already exists to ensure idempotency
DROP POLICY IF EXISTS "Public can view open jobs" ON public.jobs;

-- 2. Create policy allowing anon role SELECT access to open jobs
CREATE POLICY "Public can view open jobs"
ON public.jobs
FOR SELECT
TO anon
USING (status = 'Open');

-- 3. Ensure authenticated recruiters retain full access to all jobs
DROP POLICY IF EXISTS "Authenticated users can manage jobs" ON public.jobs;

CREATE POLICY "Authenticated users can manage jobs"
ON public.jobs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
