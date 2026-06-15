import { createFileRoute } from "@tanstack/react-router";

async function serve(slug: string, path: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await supabaseAdmin
    .from("projects")
    .select("id, html, is_public")
    .eq("slug", slug)
    .maybeSingle();
  if (!p || !p.is_public) {
    return new Response("Preview not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  const { data: page } = await (supabaseAdmin as any)
    .from("project_pages")
    .select("html")
    .eq("project_id", p.id)
    .eq("path", path)
    .maybeSingle();
  const html = page?.html ?? (path === "/" ? p.html : null);
  if (!html) return new Response("Page not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/p/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => serve(params.slug, "/"),
    },
  },
});
