import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProjects, createProject, deleteProject } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Sparkles, LogOut, Trash2, Loader2, ArrowUpRight } from "lucide-react";
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
    <div className="min-h-screen">
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/60 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-7 rounded-md bg-foreground" />
            <span className="text-display text-xl">Architeq</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs uppercase tracking-[0.15em] text-muted-foreground border border-border rounded-full px-3 py-1">
              Free tier · preview
            </span>
            <button onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-leaf mb-3">Your studio</p>
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

        {creating && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(name.trim()); }}
            className="mb-10 p-6 rounded-2xl border border-ember/30 bg-surface/40 backdrop-blur"
          >
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 block">Project name</label>
            <div className="flex gap-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme landing page"
                className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-ember/60"
              />
              <button
                type="submit"
                disabled={!name.trim() || createMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 text-sm font-medium disabled:opacity-50"
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
          <div className="text-center py-32 border border-dashed border-border rounded-2xl">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group relative rounded-2xl border border-border/60 bg-surface/40 backdrop-blur p-6 hover:bg-surface-elevated transition"
              >
                <Link
                  to="/studio/$projectId"
                  params={{ projectId: p.id }}
                  className="block"
                >
                  <h3 className="text-display text-2xl mb-2 group-hover:text-leaf transition">{p.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 min-h-[2.5rem]">
                    {p.prompt || "No prompt yet — open to start building."}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>edited {formatDistanceToNow(new Date(p.updated_at))} ago</span>
                    <ArrowUpRight className="size-4 group-hover:text-leaf transition" />
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(`Delete "${p.name}"?`)) delMut.mutate(p.id);
                  }}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-md hover:bg-background/60 text-muted-foreground hover:text-destructive"
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
  );
}
