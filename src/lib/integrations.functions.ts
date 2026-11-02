import { createServerFn } from "@tanstack/react-start";

export const getIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => ({
  supabase: Boolean(
    (process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) &&
    (process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  ),
  ai: Boolean(process.env.LOVABLE_API_KEY),
  github: Boolean(process.env.GITHUB_TOKEN),
  vercel: Boolean(process.env.VERCEL_TOKEN),
}));
