import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Cable,
  Check,
  CircleAlert,
  Database,
  Github,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getIntegrationStatus } from "@/lib/integrations.functions";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [{ title: "Connections — Architeq" }] }),
  component: Integrations,
});

function Integrations() {
  const { user } = Route.useRouteContext();
  const getStatus = useServerFn(getIntegrationStatus);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["integration-status"],
    queryFn: () => getStatus(),
  });
  const items = [
    {
      name: "AI generation",
      detail: data?.aiProvider
        ? `Build and revise sites using ${data.aiProvider}.`
        : "Build and revise sites from your prompts.",
      ready: data?.ai,
      icon: Sparkles,
      variable: "AI_GATEWAY_API_KEY or LOVABLE_API_KEY",
      setup:
        "Vercel deployments can authenticate with a request-scoped OIDC token. If this project does not receive one, enable Secure Backend Access (OIDC) in Vercel, or set one of the environment variables above.",
    },
    {
      name: "Supabase",
      detail: "Sign-in, account separation, and saving private projects and skills.",
      ready: data?.supabase,
      icon: Database,
      variable: "SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY",
    },
    {
      name: "GitHub",
      detail: "Create a repository for a site and push updates from the studio.",
      ready: data?.github,
      icon: Github,
      variable: "GITHUB_TOKEN",
    },
    {
      name: "Vercel",
      detail: "Publish a site to a production URL and deploy updates.",
      ready: data?.vercel,
      icon: Globe,
      variable: "VERCEL_TOKEN",
    },
  ];
  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="app-frame flex min-h-[calc(100vh-24px)] overflow-hidden md:min-h-[calc(100vh-40px)]">
        <WorkspaceSidebar active="integrations" email={user.email ?? undefined} />
        <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Publishing
          </p>
          <h1 className="text-display mb-3 text-4xl md:text-5xl">Connections</h1>
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
            Connect publishing services to send your generated sites to GitHub and Vercel. Once a
            project has a repository or live deployment, future generations can sync to it
            automatically.
          </p>
          {isError && (
            <p
              role="alert"
              className="mb-5 rounded-2xl border border-destructive/30 bg-surface-elevated p-4 text-sm text-destructive"
            >
              Connection status couldn’t be loaded. Check the Supabase connection and try again.
            </p>
          )}
          <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
            {items.map(({ name, detail, ready, icon: Icon, variable, setup }) => (
              <article
                key={name}
                className="rounded-3xl border border-border bg-surface-elevated p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
                      <Icon className="size-5" />
                    </span>
                    <h2 className="text-display text-2xl">{name}</h2>
                  </div>
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : ready ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/70 px-3 py-1 text-xs">
                      <Check className="size-3" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      <CircleAlert className="size-3" /> Setup needed
                    </span>
                  )}
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{detail}</p>
                {!isLoading && !ready && (
                  <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
                    <p className="mb-2 font-medium">Workspace setup</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {setup ?? (
                        <>
                          Add <code className="rounded bg-muted px-1">{variable}</code> to the app’s
                          server environment, then redeploy. The token stays on the server and is
                          never shown in this page.
                        </>
                      )}
                    </p>
                  </div>
                )}
                {ready && (
                  <p className="rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
                    {name === "AI generation"
                      ? `Ready to build and revise sites through ${data?.aiProvider ?? "the AI Gateway"}.`
                      : "Ready to use from any of your projects. Connect it in a project’s Deploy panel to enable automatic updates."}
                  </p>
                )}
              </article>
            ))}
          </div>
          <div className="mt-6 flex max-w-4xl items-start gap-3 rounded-2xl border border-border bg-surface/70 p-4 text-xs leading-relaxed text-muted-foreground">
            <Cable className="mt-0.5 size-4 shrink-0" />
            <p>
              Connections are configured by the studio administrator. Tokens are shared by the
              workspace’s publishing service; they are not stored on individual project records.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
