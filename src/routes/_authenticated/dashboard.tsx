import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProjects, createProject, deleteProject } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Sparkles, LogOut, Trash2, Loader2, ArrowUpRight, Layers } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Architeq" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const list = useServerFn(listProjects);
  const create = useServerFn(createProject);
  const del = useServerFn(deleteProject);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: (n: string) => create({ data: { name: n } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/studio/$projectId", params: { projectId: row.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="app-frame flex overflow-hidden min-h-[calc(100vh-24px)] md:min-h-[calc(100vh-40px)]">
        {/* Dark icon rail */}
        <aside className="rail w-14 md:w-16 shrink-0 flex flex-col items-center py-4 gap-2">
          <Link
            to="/"
            className="size-9 rounded-xl bg-surface-elevated flex items-center justify-center mb-3"
            aria-label="Architeq home"
          >
            <div className="size-2.5 rounded-full bg-accent" />
          </Link>
          <div className="flex flex-col gap-1.5 w-full items-center">
            <button
              className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white"
              title="Projects"
            >
              <Layers className="size-4" />
            </button>
            <button
              onClick={() => setCreating(true)}
              className="size-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition"
              title="New project"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="mt-auto flex flex-col items-center gap-2">
            <button
              onClick={handleSignOut}
              className="size-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
            <div className="size-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-semibold" title="Free tier">
              A
            </div>
          </div>
        </aside>

        {/* Main panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 md:px-10 pt-10 pb-2 flex items-end justify-between flex-wrap gap-6">
            <div>
              <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Your studio
              </span>
              <h1 className="text-display text-5xl md:text-6xl">Projects</h1>
            </div>
            {!creating && (
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-medium hover:bg-primary/90 transition"
              >
                <Plus className="size-4" /> New project
              </button>
            )}
          </div>

          <main className="flex-1 px-6 md:px-10 py-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-8">
              Free tier · preview
            </span>

            {creating && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(name.trim()); }}
                className="mb-10 p-6 rounded-3xl bg-surface-elevated border border-accent"
              >
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 block">Project name</label>
                <div className="flex flex-wrap gap-3">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme landing page"
                    className="flex-1 min-w-[220px] bg-surface border border-border rounded-full px-5 py-3 text-sm focus:outline-none focus:border-foreground/40"
                  />
                  <button
                    type="submit"
                    disabled={!name.trim() || createMut.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-medium disabled:opacity-50"
                  >
                    {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setName(""); }}
                    className="px-4 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-32 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : !projects || projects.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded-3xl bg-surface-elevated/60">
                <p className="text-display text-3xl mb-3">Nothing built yet.</p>
                <p className="text-muted-foreground mb-6">Spin up your first project — describe it, ship it.</p>
                <button
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-medium"
                >
                  <Sparkles className="size-4" /> Start building
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="group relative rounded-3xl border border-border bg-surface-elevated p-6 hover:border-foreground/25 transition"
                  >
                    <Link
                      to="/studio/$projectId"
                      params={{ projectId: p.id }}
                      className="block"
                    >
                      <h3 className="text-display text-2xl mb-2">{p.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-8 min-h-[2.5rem]">
                        {p.prompt || "No prompt yet — open to start building."}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>edited {formatDistanceToNow(new Date(p.updated_at))} ago</span>
                        <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm(`Delete "${p.name}"?`)) delMut.mutate(p.id);
                      }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive"
                      aria-label="Delete project"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
