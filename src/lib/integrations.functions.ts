import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const lovableReady = Boolean(process.env.LOVABLE_API_KEY);
  const vercelGatewayReady = Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      request?.headers.get("x-vercel-oidc-token"),
  );

  return {
    supabase: Boolean(
      (process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) &&
        (process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    ),
    ai: lovableReady || vercelGatewayReady,
    aiProvider: lovableReady ? "Lovable" : vercelGatewayReady ? "Vercel AI Gateway" : null,
    github: Boolean(process.env.GITHUB_TOKEN),
    vercel: Boolean(process.env.VERCEL_TOKEN),
  };
});
