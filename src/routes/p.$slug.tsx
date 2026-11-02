import { createFileRoute } from "@tanstack/react-router";
import { servePublicProjectPage } from "@/lib/public-preview.server";

export const Route = createFileRoute("/p/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => servePublicProjectPage(params.slug, "/"),
    },
  },
});
