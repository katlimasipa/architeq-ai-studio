import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Blocks, Loader2, Plus, Trash2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { listSkills, createSkill, deleteSkill } from "@/lib/skills.functions";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

export const Route = createFileRoute("/_authenticated/skills")({
  head: () => ({ meta: [{ title: "Skills — Architeq" }] }),
  component: SkillsLibrary,
});

const presets = [
  {
    name: "Design system",
    description: "A cohesive visual language for every page.",
    instructions:
      "Create a consistent design system. Define a focused color palette, typography scale, spacing rhythm, border radii, and reusable component treatments. Apply the same visual rules across all pages. Keep contrast accessible and use responsive layouts.",
  },
  {
    name: "Accessibility",
    description: "Improve keyboard, screen reader, and contrast support.",
    instructions:
      "Prioritize accessibility in every interface. Use semantic HTML, accessible names, clear focus indicators, keyboard operability, sufficient color contrast, reduced-motion support, and helpful form labels and error states. Do not communicate meaning through color alone.",
  },
  {
    name: "Conversion copy",
    description: "Make landing page messaging clear and persuasive.",
    instructions:
      "Write concise, specific conversion-focused copy. Lead with the customer outcome, explain the problem and value clearly, use concrete proof points, and give each section one clear purpose. Avoid generic claims, filler, fake testimonials, and unsupported statistics.",
  },
];

function SkillsLibrary() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const list = useServerFn(listSkills);
  const create = useServerFn(createSkill);
  const remove = useServerFn(deleteSkill);
  const [form, setForm] = useState({ name: "", description: "", instructions: "" });
  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills", user.id],
    queryFn: () => list(),
  });
  const createMut = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      setForm({ name: "", description: "", instructions: "" });
      void qc.invalidateQueries({ queryKey: ["skills", user.id] });
      toast.success("Skill added to your library");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't create skill"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["skills", user.id] });
      toast.success("Skill removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't remove skill"),
  });

  function selectPreset(preset: (typeof presets)[number]) {
    setForm(preset);
    document.getElementById("skill-name")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="app-frame flex min-h-[calc(100vh-24px)] overflow-hidden md:min-h-[calc(100vh-40px)]">
        <WorkspaceSidebar active="skills" email={user.email ?? undefined} />
        <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Your toolkit
          </p>
          <h1 className="text-display mb-2 text-4xl md:text-5xl">Skills</h1>
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
            Save design standards and reusable instructions. In the studio, type{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">/</code> to choose a skill; it runs
            only when you invoke its command.
          </p>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <section className="rounded-3xl border border-border bg-surface-elevated p-5 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="size-4" />
                <h2 className="text-display text-2xl">Add a skill</h2>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMut.mutate();
                }}
                className="space-y-3"
              >
                <label className="block text-xs text-muted-foreground" htmlFor="skill-name">
                  Name
                </label>
                <input
                  id="skill-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Editorial web design"
                  required
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground/40"
                />
                <label className="block text-xs text-muted-foreground" htmlFor="skill-description">
                  Short description
                </label>
                <input
                  id="skill-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What should this skill help with?"
                  maxLength={280}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground/40"
                />
                <label className="block text-xs text-muted-foreground" htmlFor="skill-instructions">
                  Instructions
                </label>
                <textarea
                  id="skill-instructions"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Describe the design principles, rules, and standards the AI should follow…"
                  required
                  minLength={20}
                  maxLength={20000}
                  rows={7}
                  className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground/40"
                />
                <button
                  type="submit"
                  disabled={createMut.isPending || form.instructions.length < 20}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {createMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <WandSparkles className="size-4" />
                  )}{" "}
                  Save skill
                </button>
              </form>
            </section>
            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-surface-elevated p-5">
                <h2 className="text-display mb-3 text-2xl">Start with an example</h2>
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                    onClick={() => selectPreset(preset)}
                      className="w-full rounded-2xl border border-border/70 p-3 text-left transition hover:border-accent"
                    >
                      <span className="block text-sm font-medium">{preset.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-3xl border border-border bg-surface-elevated p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-display text-2xl">My library</h2>
                  <Blocks className="size-4 text-leaf" />
                </div>
                {isLoading ? (
                  <Loader2 className="mx-auto my-8 size-5 animate-spin text-muted-foreground" />
                ) : !skills?.length ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Your saved skills will show up here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {skills.map((skill) => (
                      <article key={skill.id} className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-medium">{skill.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {skill.description || "Reusable instructions"}
                            </p>
                          </div>
                          {!skill.is_global && (
                            <button
                              onClick={() => deleteMut.mutate(skill.id)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                              aria-label={`Delete ${skill.name}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                        <code className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs">
                          /{skill.slug}
                        </code>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
