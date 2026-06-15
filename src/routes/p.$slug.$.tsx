import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicProject } from "@/lib/projects.functions";

export const Route = createFileRoute("/p/$slug/$")({
  loader: async ({ params }) => {
    try {
      const path = "/" + (params._splat ?? "");
      return await getPublicProject({ data: { slug: params.slug, path } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ? `${loaderData.title} — ${loaderData.name}` : (loaderData?.name ?? "Preview") },
      { name: "description", content: "Live site built with Architeq AI Studio." },
    ],
  }),
  notFoundComponent: () => (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#888" }}>404</p>
        <h1>Page not found</h1>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
      Unable to load preview.
    </div>
  ),
  component: () => {
    const { html } = Route.useLoaderData();
    // Server-rendered raw HTML — set as document
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  },
});
