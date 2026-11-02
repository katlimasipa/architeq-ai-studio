import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Building2, LayoutDashboard, Loader2, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { createProject } from "@/lib/projects.functions";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — Architeq" }] }),
  component: Templates,
});

const templates = [
  {
    name: "SaaS launch",
    type: "Product",
    icon: LayoutDashboard,
    color: "bg-accent/40",
    prompt:
      "Build a polished SaaS product landing page with a strong hero, clear product benefits, feature cards, a pricing section, testimonials with realistic placeholder names, and a confident call to action. Make the visual identity distinctive, responsive, and ready for a real product brand.",
  },
  {
    name: "Local business",
    type: "Business",
    icon: Store,
    color: "bg-emerald-100",
    prompt:
      "Create a modern website for a local service business. Include a clear value proposition, services, trust signals, opening hours, location, and an easy contact or booking call to action. Use realistic editable sample business details and a warm, professional, mobile-first design.",
  },
  {
    name: "Creative portfolio",
    type: "Portfolio",
    icon: Sparkles,
    color: "bg-lime-100",
    prompt:
      "Design an art-directed portfolio for a creative professional. Include a distinctive introduction, selected project cards, short process/about section, and contact call to action. Use elegant typography, a restrained color palette, generous whitespace, and responsive project imagery treatments.",
  },
  {
    name: "Studio / agency",
    type: "Services",
    icon: Building2,
    color: "bg-stone-200",
    prompt:
      "Create an elegant website for a design studio or consultancy. Include a positioning statement, capabilities, selected work, a concise studio story, and an inquiry call to action. Give it a cohesive editorial design system, refined typography, subtle motion, and responsive layouts.",
  },
];

function Templates() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createProject);
  const mutation = useMutation({
    mutationFn: (item: (typeof templates)[number]) =>
      create({ data: { name: item.name, prompt: item.prompt } }),
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: ["projects", user.id] });
      navigate({ to: "/studio/$projectId", params: { projectId: project.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't create project"),
  });
  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="app-frame flex min-h-[calc(100vh-24px)] overflow-hidden md:min-h-[calc(100vh-40px)]">
        <WorkspaceSidebar active="templates" email={user.email ?? undefined} />
        <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            A faster starting point
          </p>
          <h1 className="text-display mb-3 text-4xl md:text-5xl">Templates</h1>
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
            Choose a starting brief. Each selection creates a private project in your account and
            opens it in the studio.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.name}
                  className="flex min-h-64 flex-col rounded-3xl border border-border bg-surface-elevated p-6 transition hover:-translate-y-0.5 hover:border-foreground/25"
                >
                  <div
                    className={`mb-5 flex size-12 items-center justify-center rounded-2xl ${item.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {item.type}
                  </p>
                  <h2 className="text-display mb-2 text-2xl">{item.name}</h2>
                  <p className="mb-6 flex-1 text-sm text-muted-foreground">{item.prompt}</p>
                  <button
                    onClick={() => mutation.mutate(item)}
                    disabled={mutation.isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    {mutation.isPending && mutation.variables?.name === item.name ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Use template <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
