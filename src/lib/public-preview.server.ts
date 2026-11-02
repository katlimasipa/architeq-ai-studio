import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function createPublicPreviewClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!key ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Public preview is missing Supabase configuration: ${missing.join(", ")}`);
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getPublicProjectPage(slug: string, path = "/") {
  const supabase = createPublicPreviewClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, html, is_public, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (projectError) throw new Error("Unable to load the shared project.");
  if (!project || !project.is_public) return null;

  const requestedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "/";
  const { data: pages, error: pageError } = await supabase
    .from("project_pages")
    .select("html, title, path")
    .eq("project_id", project.id);

  if (pageError) throw new Error("Unable to load this page from the shared project.");
  const page = pages?.find((candidate) => candidate.path === requestedPath);
  const html = page?.html ?? (requestedPath === "/" ? project.html : null);
  if (!html) return null;

  const pagePaths = new Set((pages ?? []).map((candidate) => candidate.path));
  pagePaths.add("/");

  return {
    name: project.name,
    html: rewriteProjectPageLinks(html, slug, pagePaths),
    title: page?.title ?? project.name,
    path: requestedPath,
    updated_at: project.updated_at,
  };
}

function rewriteProjectPageLinks(html: string, slug: string, pagePaths: Set<string>) {
  const previewRoot = `/p/${encodeURIComponent(slug)}`;
  return html.replace(/(<a\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/gi, (match, prefix: string, quote: string, href: string) => {
    if (!href.startsWith("/") || href.startsWith("//")) return match;

    const suffixStart = href.search(/[?#]/);
    const pathname = suffixStart < 0 ? href : href.slice(0, suffixStart);
    const suffix = suffixStart < 0 ? "" : href.slice(suffixStart);
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
    if (!pagePaths.has(normalizedPath)) return match;

    return `${prefix}${quote}${previewRoot}${normalizedPath === "/" ? "" : normalizedPath}${suffix}${quote}`;
  });
}

export async function servePublicProjectPage(slug: string, path = "/") {
  try {
    const page = await getPublicProjectPage(slug, path);
    if (!page) {
      return new Response("Preview not found or is private.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new Response(page.html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[Public preview] Failed to serve a shared page", error);
    return new Response("Preview is temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
