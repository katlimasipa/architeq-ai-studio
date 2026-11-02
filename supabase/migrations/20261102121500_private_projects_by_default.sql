-- Private project records should only be readable by their owner when signed in.
-- Anonymous visitors can still read explicitly shared projects through the public policy.
ALTER TABLE public.projects
  ALTER COLUMN is_public SET DEFAULT false;

-- Existing projects were public by default; make them private until their owner shares them.
UPDATE public.projects SET is_public = false WHERE is_public = true;

DROP POLICY IF EXISTS "public read of public projects" ON public.projects;
CREATE POLICY "anonymous read of public projects" ON public.projects
  FOR SELECT TO anon
  USING (is_public = true);
