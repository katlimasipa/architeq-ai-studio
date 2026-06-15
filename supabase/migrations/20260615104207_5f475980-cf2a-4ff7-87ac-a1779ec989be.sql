
-- Multi-page support
CREATE TABLE IF NOT EXISTS public.project_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  path text NOT NULL,
  title text NOT NULL DEFAULT '',
  html text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_pages TO authenticated;
GRANT SELECT ON public.project_pages TO anon;
GRANT ALL ON public.project_pages TO service_role;
ALTER TABLE public.project_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pages" ON public.project_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public pages read" ON public.project_pages FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_pages.project_id AND p.is_public = true)
);
CREATE TRIGGER project_pages_touch BEFORE UPDATE ON public.project_pages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Deployment tracking on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS github_repo text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS vercel_project_id text,
  ADD COLUMN IF NOT EXISTS vercel_url text,
  ADD COLUMN IF NOT EXISTS last_deployed_at timestamptz;
