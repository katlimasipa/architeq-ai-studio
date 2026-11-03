import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import orbImg from "@/assets/orb.jpg";
import { ArrowUpRight, Command, Layers, Cpu, Rocket, GitBranch, Globe, Shield, Wand2, Loader2, Plus, Palette, Blocks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createProject } from "@/lib/projects.functions";
import { PENDING_PROJECT_PROMPT_KEY, suggestProjectName } from "@/lib/project-name";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Architeq — The AI Website Operating System" },
      { name: "description", content: "Architeq generates, edits, and deploys agency-grade websites and web apps from a single prompt. Built for studios, founders, and teams shipping at the frontier." },
      { property: "og:title", content: "Architeq — The AI Website Operating System" },
      { property: "og:description", content: "Generate, edit, and deploy agency-grade websites from a single prompt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <Nav />
      <div className="app-frame">
        <Hero />
        <Marquee />
        <Capabilities />
        <Prompt />
        <Agents />
        <Workflow />
        <Stack />
        <Pricing />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed top-3 md:top-5 inset-x-3 md:inset-x-5 z-50">
      <div className="app-frame !rounded-[20px] h-16 px-5 flex items-center justify-between">
        <a href="#" className="flex items-center" aria-label="Architeq AI Studio home">
          <img src="/architeq-logo.webp" alt="Architeq AI Studio" className="h-10 w-auto max-w-[180px] object-contain" />
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#capabilities" className="hover:text-foreground transition">Capabilities</a>
          <a href="#agents" className="hover:text-foreground transition">Agents</a>
          <a href="#workflow" className="hover:text-foreground transition">Workflow</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/auth" className="inline text-sm text-muted-foreground hover:text-foreground">Sign in</a>
          <a href="/auth" className="group inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-2.5 text-sm font-medium hover:bg-primary/90 transition sm:px-4">
            <span className="hidden sm:inline">Open Studio</span><span className="sm:hidden">Studio</span>
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-6 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground">
            <span className="size-1.5 rounded-full bg-accent-foreground" />
            A focused studio for building the web
          </span>
        </div>

        <h1 className="text-display text-[clamp(2.75rem,7vw,6.5rem)] max-w-5xl text-foreground">
          Build your idea <br />
          into something <span className="text-muted-foreground">real.</span>
        </h1>

        <div className="mt-10 grid md:grid-cols-12 gap-10 items-end">
          <p className="md:col-span-5 text-lg text-muted-foreground leading-relaxed">
            Plan, create, and refine a website in one workspace. Keep your projects,
            design skills, and publishing tools together from the first prompt to launch.
          </p>
          <div className="md:col-span-4 md:col-start-9 flex flex-wrap gap-3">
            <a href="#prompt" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-medium hover:bg-primary/90 transition">
              <ArrowUpRight className="size-4" />
              Start building
            </a>
            <a href="#workflow" className="inline-flex items-center gap-2 rounded-full bg-surface-elevated border border-border px-5 py-3 text-sm hover:border-foreground/30 transition">
              See it think
            </a>
          </div>
        </div>

        <WorkspacePreview />
      </div>
    </section>
  );
}

function WorkspacePreview() {
  const tabs = ["Projects", "Templates", "Skills", "Connections"];
  return (
    <div className="mt-14 rounded-[28px] border border-border bg-muted p-2.5 md:p-4" aria-label="Preview of the Architeq workspace">
      <div className="grid min-h-[420px] overflow-hidden rounded-[22px] bg-surface sm:grid-cols-[4.5rem_minmax(0,1fr)]">
        <aside aria-hidden="true" className="rail hidden flex-col items-center gap-4 py-5 sm:flex">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-surface-elevated">
            <img src="/favicon.png" alt="" className="size-9 rounded-xl object-cover" />
          </span>
          <span className="mt-3 flex size-9 items-center justify-center rounded-2xl bg-white/15 text-white"><Layers className="size-4" /></span>
          <span className="flex size-9 items-center justify-center rounded-2xl text-white/60"><Palette className="size-4" /></span>
          <span className="flex size-9 items-center justify-center rounded-2xl text-white/60"><Blocks className="size-4" /></span>
          <span className="mt-auto size-8 rounded-full border border-white/20 bg-white/10" />
        </aside>

        <div className="min-w-0 p-4 md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your studio</p>
              <h2 className="text-display text-3xl md:text-4xl">Everything in its place.</h2>
            </div>
            <a href="/auth" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
              <Plus className="size-3.5" /> Create a project
            </a>
          </div>

          <div className="my-5 flex flex-wrap gap-2" aria-hidden="true">
            {tabs.map((label, index) => (
              <span key={label} className={`rounded-full border px-3.5 py-2 text-xs ${index === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-elevated text-muted-foreground"}`}>
                {label}
              </span>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-border bg-surface-elevated p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Start with a clear brief</p>
                  <h3 className="text-display text-2xl">A new idea, ready to shape.</h3>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted"><Layers className="size-4" /></span>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Describe the site you want to make. Your preview, saved skills, and project history stay together as you refine it.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1.5">Private projects</span>
                  <span className="rounded-full bg-accent/70 px-3 py-1.5 text-foreground">Live preview</span>
                </div>
              </div>
            </article>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <article className="rounded-3xl bg-accent/70 p-5">
                <p className="mb-3 text-xs text-foreground/65">Personal toolkit</p>
                <h3 className="text-display text-2xl">Design skills that work your way.</h3>
                <p className="mt-3 text-xs leading-relaxed text-foreground/70">Save your standards, then call them with a slash command.</p>
              </article>
              <article className="rounded-3xl bg-primary p-5 text-primary-foreground">
                <p className="mb-3 text-xs text-primary-foreground/60">When you’re ready</p>
                <h3 className="text-display text-2xl">Share it or ship it.</h3>
                <p className="mt-3 text-xs leading-relaxed text-primary-foreground/70">Connect GitHub and Vercel from your project workspace.</p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const logos = ["FRAMER", "VERCEL", "LINEAR", "STRIPE", "RAYCAST", "FIGMA", "SUPABASE", "NEXT.JS", "GITHUB"];

function Marquee() {
  return (
    <section className="py-16 border-y border-border overflow-hidden">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-8">
        Inspired by — and interoperable with — the tools you already trust
      </p>
      <div className="relative">
        <div className="flex gap-16 animate-[marquee_40s_linear_infinite] whitespace-nowrap">
          {[...logos, ...logos, ...logos].map((l, i) => (
            <span key={i} className="text-display text-3xl text-muted-foreground/40 tracking-wider">
              {l}
            </span>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-surface to-transparent" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-surface to-transparent" />
      </div>
    </section>
  );
}

function Capabilities() {
  const items = [
    { icon: Wand2, title: "Generation", body: "Prompt to production website in minutes — landing pages, SaaS, portfolios, dashboards.", span: "md:col-span-2 md:row-span-2" },
    { icon: Layers, title: "Visual builder", body: "Drag, edit, version. Framer-grade canvas wired to your codebase." },
    { icon: Cpu, title: "Memory & RAG", body: "Persistent brand, design and code preferences across every project." },
    { icon: Rocket, title: "One-click deploy", body: "Vercel, Cloudflare, Netlify. Preview and production in a single command." },
    { icon: GitBranch, title: "GitHub native", body: "Repos, branches, PRs and CI flow. Your code, always exportable." },
    { icon: Shield, title: "Quality gates", body: "Lighthouse 90+, WCAG AA, SEO 95+. The agent won't ship below the bar." },
    { icon: Globe, title: "Domains & SSL", body: "Attach custom domains, manage DNS, ship globally on the edge." },
  ];
  return (
    <section id="capabilities" className="px-6 md:px-12 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-leaf mb-4">01 — Capabilities</p>
            <h2 className="text-display text-4xl md:text-6xl max-w-3xl">
              A complete studio, <br />
              <span className="text-muted-foreground">not just a chatbot.</span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Every primitive of a modern web agency — design, code, content, deployment — fused into one autonomous loop.
          </p>
        </div>

        <div className="grid md:grid-cols-4 md:grid-rows-3 gap-3">
          {items.map((item, i) => (
            <article
              key={i}
              className={`group relative rounded-3xl border border-border p-7 hover:border-foreground/25 transition overflow-hidden ${item.span ?? ""} ${i === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-surface-elevated"}`}
            >
              <div className="flex items-start justify-between mb-12">
                <item.icon className={`size-5 ${i === 0 ? "text-accent" : "text-foreground"}`} strokeWidth={1.5} />
                <span className={`font-mono text-[10px] ${i === 0 ? "text-primary-foreground/50" : "text-muted-foreground"}`}>0{i + 1}</span>
              </div>
              <h3 className="text-display text-2xl mb-2">{item.title}</h3>
              <p className={`text-sm leading-relaxed max-w-sm ${i === 0 ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{item.body}</p>
              {i === 0 && (
                <img
                  src={orbImg}
                  alt=""
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="absolute -bottom-10 -right-10 size-64 rounded-full object-cover opacity-70 pointer-events-none"
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Prompt() {
  const navigate = useNavigate();
  const create = useServerFn(createProject);
  const [prompt, setPrompt] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  async function handleCompose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const brief = prompt.trim();
    if (!brief || isComposing) return;

    setIsComposing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.sessionStorage.setItem(PENDING_PROJECT_PROMPT_KEY, brief);
        await navigate({ to: "/auth" });
        return;
      }

      const project = await create({
        data: { name: suggestProjectName(brief), prompt: brief },
      });
      await navigate({ to: "/studio/$projectId", params: { projectId: project.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create your project. Try again.");
    } finally {
      setIsComposing(false);
    }
  }

  return (
    <section id="prompt" className="px-6 md:px-12 py-24">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs uppercase tracking-[0.2em] text-leaf mb-4 text-center">02 — The Composer</p>
        <h2 className="text-display text-4xl md:text-6xl text-center mb-4">
          One prompt away.
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
          Describe the outcome — Architeq plans the architecture, generates the design system, writes the code, and renders the result.
        </p>

        <div className="rounded-[28px] border border-border bg-muted p-2.5 md:p-3">
          <div className="rounded-[22px] border border-border/70 bg-surface-elevated p-5 md:p-7">
            <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-leaf" />
                <span>Your project brief</span>
              </div>
              <span className="hidden sm:inline">Private to your account</span>
            </div>
            <form onSubmit={handleCompose}>
              <label htmlFor="project-prompt" className="sr-only">Describe the website or app you want to build</label>
              <div className="flex items-start gap-3 text-base leading-relaxed text-foreground">
                <span className="pt-1 text-leaf" aria-hidden="true">›</span>
                <textarea
                  id="project-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the website or app you want to build…"
                  maxLength={8000}
                  rows={4}
                  className="min-h-28 w-full resize-y bg-transparent placeholder:text-muted-foreground/75 focus:outline-none"
                />
              </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Command className="size-3.5" />
                <span>Plan · Create · Publish</span>
              </div>
              <button type="submit" disabled={!prompt.trim() || isComposing} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-50">
                {isComposing ? <><Loader2 className="size-4 animate-spin" /> Creating…</> : <>Create project <ArrowUpRight className="size-4" /></>}
              </button>
            </div>
            <p className="mt-3 text-right text-xs text-muted-foreground">Your project opens in the studio preview.</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Agents() {
  const agents = [
    { name: "Design", desc: "Layouts, color, type, motion, hierarchy.", n: "01" },
    { name: "Frontend", desc: "React, Next.js, Tailwind, shadcn, a11y.", n: "02" },
    { name: "Backend", desc: "APIs, databases, auth, business logic.", n: "03" },
    { name: "SEO", desc: "Metadata, structured data, sitemaps.", n: "04" },
    { name: "Copy", desc: "Headlines, body, CTAs, brand voice.", n: "05" },
    { name: "Deploy", desc: "CI/CD, Vercel, Cloudflare, GitHub.", n: "06" },
    { name: "QA", desc: "Bugs, performance, contrast, responsiveness.", n: "07" },
  ];
  return (
    <section id="agents" className="px-6 md:px-12 py-24 border-t border-border">
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-12 gap-12 mb-14">
          <div className="md:col-span-5">
            <p className="text-xs uppercase tracking-[0.2em] text-leaf mb-4">03 — Multi-agent</p>
            <h2 className="text-display text-4xl md:text-5xl">
              Seven specialists. <br />
              <span className="text-muted-foreground">One orchestrator.</span>
            </h2>
          </div>
          <p className="md:col-span-5 md:col-start-8 text-muted-foreground self-end text-lg leading-relaxed">
            Architeq isn't a single model. It's a coordinated team — each agent fluent in its
            craft, each decision auditable, each handoff observable.
          </p>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {agents.map((a) => (
            <div key={a.n} className="grid md:grid-cols-12 gap-6 py-7 group hover:bg-surface-elevated transition px-3 -mx-3 rounded-2xl">
              <span className="md:col-span-2 font-mono text-xs text-muted-foreground pt-1">{a.n} / agent</span>
              <h3 className="md:col-span-4 text-display text-3xl group-hover:translate-x-1 transition">{a.name}</h3>
              <p className="md:col-span-5 text-muted-foreground self-center">{a.desc}</p>
              <ArrowUpRight className="md:col-span-1 size-5 text-muted-foreground group-hover:text-foreground justify-self-end self-center transition" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { t: "Plan", d: "Architeq drafts sitemap, IA, components, schema and copy direction before a single line ships." },
    { t: "Generate", d: "Agents compose the design system, write the code, generate assets and wire the backend in parallel." },
    { t: "Refine", d: "Talk to it. Visual builder + chat operate on the same source of truth — never out of sync." },
    { t: "Deploy", d: "Push to GitHub. Ship to Vercel or Cloudflare. Attach domain. Monitor. Repeat." },
  ];
  return (
    <section id="workflow" className="px-6 md:px-12 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.2em] text-leaf mb-4">04 — Workflow</p>
        <h2 className="text-display text-4xl md:text-6xl mb-14 max-w-4xl">
          From idea to production <br />
          in <span className="text-muted-foreground">four moves.</span>
        </h2>

        <div className="grid md:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <div key={s.t} className={`p-7 rounded-3xl border min-h-[240px] flex flex-col ${i === 3 ? "bg-accent border-accent text-accent-foreground" : "bg-surface-elevated border-border"}`}>
              <div className="flex items-center justify-between mb-10">
                <span className={`font-mono text-xs ${i === 3 ? "text-accent-foreground/60" : "text-muted-foreground"}`}>step.0{i + 1}</span>
                <div className={`size-8 rounded-full border flex items-center justify-center text-xs ${i === 3 ? "border-accent-foreground/30" : "border-border"}`}>{i + 1}</div>
              </div>
              <h3 className="text-display text-3xl mb-3">{s.t}</h3>
              <p className={`text-sm leading-relaxed ${i === 3 ? "text-accent-foreground/80" : "text-muted-foreground"}`}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stack() {
  return (
    <section className="px-6 md:px-12 py-24 border-t border-border">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-leaf mb-4">05 — Under the hood</p>
          <h2 className="text-display text-4xl md:text-5xl mb-6">
            Boring tech. <br />
            <span className="text-muted-foreground">Beautiful output.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Every Architeq project exports as a clean, typed, idiomatic codebase you'd
            be proud to hand to a senior engineer. No lock-in. No black box.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              ["Next.js 15", "React 19"],
              ["TypeScript", "Tailwind v4"],
              ["Supabase", "PostgreSQL"],
              ["Cloudflare", "Vercel"],
            ].flat().map((t) => (
              <div key={t} className="font-mono text-sm text-muted-foreground border-b border-border pb-2">
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative aspect-square rounded-[28px] border border-border bg-surface-elevated overflow-hidden">
          <img src={orbImg} alt="" loading="lazy" width={1024} height={1024} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-tr from-foreground/70 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 font-mono text-xs text-primary-foreground/80 space-y-1">
            <div>› build complete</div>
            <div>› 0 errors · 0 warnings</div>
            <div>› lighthouse: 98 / 100 / 100 / 96</div>
            <div className="text-accent">› ready for deploy ↗</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: "Solo", price: "29", desc: "For independent builders and freelancers.", features: ["3 active projects", "Unlimited generations", "GitHub sync", "Vercel deploy"] },
    { name: "Studio", price: "99", desc: "For agencies and product teams.", features: ["Unlimited projects", "5 team seats", "Custom skills & memory", "Priority agents", "Client review mode"], highlight: true },
    { name: "Scale", price: "Custom", desc: "For platforms and enterprises.", features: ["SSO + audit logs", "Dedicated infra", "Custom agents", "SLAs & support"] },
  ];
  return (
    <section id="pricing" className="px-6 md:px-12 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.2em] text-leaf mb-4">06 — Pricing</p>
        <h2 className="text-display text-4xl md:text-6xl mb-14 max-w-3xl">
          Priced like software. <br />
          <span className="text-muted-foreground">Valued like an agency.</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl p-8 border bg-surface-elevated ${p.highlight ? "border-2 border-accent" : "border-border"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 text-[10px] uppercase tracking-[0.2em] bg-accent text-accent-foreground px-3 py-1 rounded-full font-medium">
                  Most popular
                </span>
              )}
              <h3 className="text-display text-3xl mb-2">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{p.desc}</p>
              <div className="flex items-baseline gap-1 mb-8">
                {p.price !== "Custom" && <span className="text-muted-foreground">$</span>}
                <span className="text-display text-6xl">{p.price}</span>
                {p.price !== "Custom" && <span className="text-muted-foreground text-sm">/ month</span>}
              </div>
              <button className={`w-full rounded-full py-3 text-sm font-medium transition mb-8 ${p.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:border-foreground/30"}`}>
                {p.price === "Custom" ? "Talk to sales" : "Start free"}
              </button>
              <ul className="space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-leaf mt-0.5">—</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-6 md:px-12 py-32 relative">
      <div className="mx-auto max-w-4xl text-center relative">
        <h2 className="text-display text-5xl md:text-7xl mb-8">
          Build something <br />
          <span className="text-muted-foreground">worth shipping.</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          The studio is open. Bring a prompt, a Figma frame, or just a feeling. Architeq takes it from there.
        </p>
        <a href="#prompt" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-sm font-medium hover:bg-primary/90 transition">
          Start with a prompt
          <ArrowUpRight className="size-4" />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 md:px-12 py-14">
      <div className="mx-auto max-w-6xl grid md:grid-cols-5 gap-12">
        <div className="md:col-span-2">
          <img src="/architeq-logo.webp" alt="Architeq AI Studio" className="h-10 w-auto max-w-[180px] object-contain mb-4" />
          <p className="text-sm text-muted-foreground max-w-xs">
            The autonomous studio for building the web. Crafted in the open.
          </p>
        </div>
        {[
          { h: "Product", l: ["Studio", "Agents", "Templates", "Changelog"] },
          { h: "Company", l: ["About", "Careers", "Press", "Contact"] },
          { h: "Resources", l: ["Docs", "Guides", "API", "Status"] },
        ].map((c) => (
          <div key={c.h}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">{c.h}</p>
            <ul className="space-y-2.5 text-sm">
              {c.l.map((i) => <li key={i}><a href="#" className="hover:text-leaf transition">{i}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl mt-14 pt-8 border-t border-border flex flex-wrap justify-between gap-4 text-xs text-muted-foreground font-mono">
        <span>© 2026 Architeq AI Studio</span>
        <span>Built with Architeq · v0.9.2</span>
      </div>
    </footer>
  );
}
