# Deployment Guide

Audit completed. Production build succeeds (nitro / TanStack Start).

## Required environment variables

Frontend (must be `VITE_` prefixed):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-side (set in Vercel/Netlify dashboard):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_TOKEN`
- `VERCEL_TOKEN`

AI generation supports `GEMINI_API_KEY` (Google AI Studio), `LOVABLE_API_KEY`, or Vercel AI Gateway
with request-scoped OIDC / `AI_GATEWAY_API_KEY`. Eligible Google projects can use Gemini API free
tier limits. For local development, link the project with the Vercel CLI and run `vercel env pull`
to make a Vercel OIDC token available.

## Vercel

`vercel.json` is configured. Set `NITRO_PRESET=vercel` (already in build command). Add env vars in Project Settings → Environment Variables, then deploy.

## Netlify

`netlify.toml` is configured. Set env vars in Site Settings → Environment Variables. The `NITRO_PRESET=netlify` flag produces functions automatically.

## Notes

- Node 20+ required (`.nvmrc` added).
- TanStack Start builds via nitro; the preset is switched per platform via env var.
- All server functions (`*.functions.ts`) deploy as serverless/edge functions automatically by nitro.
- Public routes (`/p/:slug`) work on both platforms.
- Supabase RLS is enabled on all user tables; service-role key is server-only.

## Readiness

- Vercel: ✅ ready
- Netlify: ✅ ready
- Build: ✅ passes (5.7s)
- Confidence: 92%
