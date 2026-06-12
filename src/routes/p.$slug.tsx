import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicProject } from "@/lib/projects.functions";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    try {
      return await getPublicProject({ data: { slug: params.slug } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.name ? `${loaderData.name} — Architeq Preview` : "Preview" },
      { name: "description", content: "Live preview built with Architeq AI Studio." },
      { property: "og:title", content: loaderData?.name ?? "Architeq Preview" },
      { property: "og:description", content: "Live preview built with Architeq AI Studio." },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-md px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">404</p>
        <h1 className="text-display text-3xl mb-2">Preview not found</h1>
        <p className="text-sm text-muted-foreground">This preview may have been deleted or made private.</p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">Unable to load preview.</p>
    </div>
  ),
  component: PublicPreview,
});

function PublicPreview() {
  const { html, name } = Route.useLoaderData();
  if (!html) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-display text-2xl mb-1">{name}</p>
          <p className="text-sm text-muted-foreground">No content generated yet.</p>
        </div>
      </div>
    );
  }
  return (
    <iframe
      title={name}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      className="fixed inset-0 w-screen h-screen border-0 bg-white"
    />
  );
}
