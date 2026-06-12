
-- Extend projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS design_dna jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Backfill slugs
UPDATE public.projects SET slug = encode(gen_random_bytes(6), 'hex') WHERE slug IS NULL;
ALTER TABLE public.projects ALTER COLUMN slug SET NOT NULL;

-- Public read policy for shareable previews
DROP POLICY IF EXISTS "public read of public projects" ON public.projects;
CREATE POLICY "public read of public projects" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

GRANT SELECT ON public.projects TO anon;

-- project_assets
CREATE TABLE IF NOT EXISTS public.project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'reference', -- 'logo' | 'reference' | 'image'
  name text NOT NULL,
  url text NOT NULL,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assets TO authenticated;
GRANT ALL ON public.project_assets TO service_role;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets" ON public.project_assets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- project_versions
CREATE TABLE IF NOT EXISTS public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version integer NOT NULL,
  prompt text NOT NULL DEFAULT '',
  html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON public.project_versions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_versions_project ON public.project_versions(project_id, version DESC);

-- skills
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- NULL = global/built-in
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  instructions text NOT NULL,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT SELECT ON public.skills TO anon;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read skills (global or own)" ON public.skills FOR SELECT TO authenticated, anon
  USING (is_global = true OR auth.uid() = user_id);
CREATE POLICY "manage own skills" ON public.skills FOR ALL TO authenticated
  USING (auth.uid() = user_id AND is_global = false)
  WITH CHECK (auth.uid() = user_id AND is_global = false);
CREATE TRIGGER skills_updated BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- project_skills (active stack)
CREATE TABLE IF NOT EXISTS public.project_skills (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, skill_id)
);
GRANT SELECT, INSERT, DELETE ON public.project_skills TO authenticated;
GRANT ALL ON public.project_skills TO service_role;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own project_skills" ON public.project_skills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed built-in Impeccable Design skill
INSERT INTO public.skills (user_id, name, slug, description, instructions, is_global)
VALUES (
  NULL,
  'Impeccable Design',
  'impeccable-design',
  'Award-winning visual craft. Bold aesthetic direction, distinctive typography, premium spacing, intentional motion. Bans generic AI tells.',
  $$You are operating under the IMPECCABLE DESIGN skill. Generated output MUST feel hand-crafted by a senior agency designer, never AI-templated.

NON-NEGOTIABLE RULES:
- Pick a clear aesthetic direction (editorial, brutalist, luxury minimal, retro-futuristic, organic, etc.) and execute with conviction. No timid middle-ground.
- Typography: distinctive display font + refined body font from Google Fonts. BANNED defaults: Inter, Roboto, Open Sans, Poppins, Montserrat, DM Sans, Plus Jakarta, Space Grotesk, Instrument Sans, Instrument Serif, Fraunces, Playfair Display, Cormorant. Pick something true to the brand: Fraktion, Söhne-likes (use Geist/Satoshi), Spectral, Bricolage Grotesque, Familjen Grotesk, Redaction, EB Garamond, Crimson Pro variants, Tiempos-likes (use Lora variants), JetBrains Mono / IBM Plex Mono only as accents, etc.
- Color: OKLCH-feeling palette, tinted neutrals (never pure #000/#fff), bold accent used at 10% weight. NEVER cyan/purple-on-dark, NEVER gradient text, NEVER neon glow.
- Layout: varied spacing rhythm, asymmetry where appropriate, generous whitespace. NEVER nested cards, NEVER identical icon+heading+text card grids, NEVER center-everything.
- Banned CSS: side-stripe borders (border-left/right > 1px), background-clip:text gradients, glassmorphism everywhere, generic drop shadows.
- Motion: subtle, transform+opacity only, ease-out. No bounce.
- Copy: real, considered words. Never lorem ipsum, never fake testimonials/stats.
- Mobile-first responsive, semantic HTML, accessible contrast.

THE AI SLOP TEST: if it looks obviously AI-generated, redo it.$$,
  true
)
ON CONFLICT (user_id, slug) DO NOTHING;
