import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import orbImg from "@/assets/orb.jpg";
import { ArrowUpRight, Sparkles, Command, Layers, Cpu, Rocket, GitBranch, Globe, Shield, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Architeq — The AI Website Operating System" },
      { name: "description", content: "Architeq generates, edits, and deploys agency-grade websites and web apps from a single prompt. Built for studios, founders, and teams shipping at the frontier." },
      { property: "og:title", content: "Architeq — The AI Website Operating System" },
      { property: "og:description", content: "Generate, edit, and deploy agency-grade websites from a single prompt." },
      { property: "og:image", content: heroImg },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Nav />
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
  );
}

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-gradient-to-br from-ember to-violet relative overflow-hidden">
            <div className="absolute inset-[2px] rounded-[5px] bg-background/80 flex items-center justify-center">
              <div className="size-2 rounded-sm bg-foreground" />
            </div>
          </div>
          <span className="text-display text-xl tracking-tight">Architeq</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1 mt-1">Studio</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#capabilities" className="hover:text-foreground transition">Capabilities</a>
          <a href="#agents" className="hover:text-foreground transition">Agents</a>
          <a href="#workflow" className="hover:text-foreground transition">Workflow</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#" className="hover:text-foreground transition">Changelog</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/auth" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">Sign in</a>
          <a href="/auth" className="group inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition">
            Open Studio
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-40 pb-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2 mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-ember animate-pulse" />
            v0.9 — Multi-agent orchestration is live
          </span>
        </div>

        <h1 className="text-display text-[clamp(3rem,9vw,8.5rem)] max-w-6xl">
          The operating system <br />
          for <span className="italic text-muted-foreground">building</span> the web.
        </h1>

        <div className="mt-10 grid md:grid-cols-12 gap-10 items-end">
          <p className="md:col-span-5 text-lg text-muted-foreground leading-relaxed">
            Architeq is an autonomous studio that generates, refines, and deploys
            agency-grade websites and web applications. Prompt once. Iterate in chat.
            Ship to production.
          </p>
          <div className="md:col-span-4 md:col-start-9 flex flex-wrap gap-3">
            <a href="/auth" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-3 text-sm font-medium hover:bg-foreground/90 transition">
              <Sparkles className="size-4" />
              Start building
            </a>
            <a href="#workflow" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-5 py-3 text-sm hover:bg-surface transition backdrop-blur">
              See it think
            </a>
          </div>
        </div>

        <div className="mt-20 relative rounded-2xl overflow-hidden border border-border/60 bg-surface/30 backdrop-blur">
          <img
            src={heroImg}
            alt="Architeq composing a website in real time"
            width={1600}
            height={1200}
            className="w-full h-auto"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
            <div className="font-mono text-xs text-muted-foreground/80">
              <div>~ architeq build "studio landing, editorial, dark, ember accents"</div>
              <div className="text-foreground/60 mt-1">› orchestrating 7 agents · 24 components generated · 98 lighthouse</div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5">⌘</kbd>
              <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5">K</kbd>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const logos = ["FRAMER", "VERCEL", "LINEAR", "STRIPE", "RAYCAST", "FIGMA", "SUPABASE", "NEXT.JS", "GITHUB"];

function Marquee() {
  return (
    <section className="py-16 border-y border-border/40 overflow-hidden">
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
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent" />
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
    <section id="capabilities" className="px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-16">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4">01 — Capabilities</p>
            <h2 className="text-display text-5xl md:text-7xl max-w-3xl">
              A complete studio, <br />
              <span className="italic text-muted-foreground">not just a chatbot.</span>
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
              className={`group relative rounded-2xl border border-border/60 bg-surface/40 backdrop-blur p-7 hover:bg-surface-elevated transition overflow-hidden ${item.span ?? ""}`}
            >
              <div className="flex items-start justify-between mb-12">
                <item.icon className="size-5 text-ember" strokeWidth={1.5} />
                <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="text-display text-2xl mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{item.body}</p>
              {i === 0 && (
                <img
                  src={orbImg}
                  alt=""
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="absolute -bottom-10 -right-10 size-72 object-cover opacity-60 mix-blend-screen pointer-events-none"
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
  return (
    <section id="prompt" className="px-6 py-32">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4 text-center">02 — The Composer</p>
        <h2 className="text-display text-5xl md:text-7xl text-center mb-4">
          One prompt away.
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
          Describe the outcome — Architeq plans the architecture, generates the design system, writes the code, and renders the result.
        </p>

        <div className="relative rounded-3xl border border-border bg-surface/60 backdrop-blur-xl p-2 shadow-[0_30px_80px_-20px_oklch(0_0_0/0.6)]">
          <div className="rounded-2xl bg-background/80 p-6">
            <div className="flex items-center justify-between mb-4 text-xs font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-ember" />
                <span>composer.architeq</span>
              </div>
              <span>gpt-orchestrator · claude-3.5 · gemini-pro</span>
            </div>
            <div className="font-mono text-base leading-relaxed">
              <span className="text-muted-foreground">› </span>
              Build a <span className="text-ember">conversion-focused</span> landing page for a B2B fintech
              with <span className="text-ember">editorial typography</span>, a working pricing page, blog,
              and a contact form wired to <span className="text-ember">Supabase</span>.
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["+ Add brand kit", "+ Reference URL", "+ Figma frame", "+ Existing repo"].map((t) => (
                <button key={t} className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-elevated transition text-muted-foreground hover:text-foreground">
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Command className="size-3.5" />
                <span>Plan → Generate → Deploy</span>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition">
                Compose
                <Sparkles className="size-4" />
              </button>
            </div>
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
    <section id="agents" className="px-6 py-32 border-t border-border/40">
      <div className="mx-auto max-w-7xl">
        <div className="grid md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4">03 — Multi-agent</p>
            <h2 className="text-display text-5xl md:text-6xl">
              Seven specialists. <br />
              <span className="italic text-muted-foreground">One orchestrator.</span>
            </h2>
          </div>
          <p className="md:col-span-5 md:col-start-8 text-muted-foreground self-end text-lg leading-relaxed">
            Architeq isn't a single model. It's a coordinated team — each agent fluent in its
            craft, each decision auditable, each handoff observable.
          </p>
        </div>

        <div className="divide-y divide-border/60 border-y border-border/60">
          {agents.map((a) => (
            <div key={a.n} className="grid md:grid-cols-12 gap-6 py-8 group hover:bg-surface/30 transition px-2 -mx-2 rounded-lg">
              <span className="md:col-span-2 font-mono text-xs text-muted-foreground pt-1">{a.n} / agent</span>
              <h3 className="md:col-span-4 text-display text-3xl group-hover:translate-x-1 transition">{a.name}</h3>
              <p className="md:col-span-5 text-muted-foreground self-center">{a.desc}</p>
              <ArrowUpRight className="md:col-span-1 size-5 text-muted-foreground group-hover:text-ember justify-self-end self-center transition" />
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
    <section id="workflow" className="px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4">04 — Workflow</p>
        <h2 className="text-display text-5xl md:text-7xl mb-20 max-w-4xl">
          From idea to production <br />
          in <span className="italic">four moves.</span>
        </h2>

        <div className="grid md:grid-cols-4 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
          {steps.map((s, i) => (
            <div key={s.t} className="bg-background p-8 min-h-[260px] flex flex-col">
              <div className="flex items-center justify-between mb-12">
                <span className="font-mono text-xs text-muted-foreground">step.0{i + 1}</span>
                <div className="size-8 rounded-full border border-border flex items-center justify-center text-xs">{i + 1}</div>
              </div>
              <h3 className="text-display text-3xl mb-3">{s.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stack() {
  return (
    <section className="px-6 py-32 border-t border-border/40">
      <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-20 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4">05 — Under the hood</p>
          <h2 className="text-display text-5xl md:text-6xl mb-6">
            Boring tech. <br />
            <span className="italic text-muted-foreground">Beautiful output.</span>
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

        <div className="relative aspect-square rounded-3xl border border-border/60 bg-surface/40 backdrop-blur overflow-hidden">
          <img src={orbImg} alt="" loading="lazy" width={1024} height={1024} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 font-mono text-xs text-muted-foreground space-y-1">
            <div>› build complete</div>
            <div>› 0 errors · 0 warnings</div>
            <div>› lighthouse: 98 / 100 / 100 / 96</div>
            <div className="text-ember">› ready for deploy ↗</div>
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
    <section id="pricing" className="px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.2em] text-ember mb-4">06 — Pricing</p>
        <h2 className="text-display text-5xl md:text-7xl mb-16 max-w-3xl">
          Priced like software. <br />
          <span className="italic text-muted-foreground">Valued like an agency.</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-8 border ${p.highlight ? "border-ember/40 bg-gradient-to-b from-ember/5 to-transparent" : "border-border/60 bg-surface/40"} backdrop-blur`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 text-[10px] uppercase tracking-[0.2em] bg-ember text-background px-2 py-1 rounded-full">
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
              <button className={`w-full rounded-full py-3 text-sm font-medium transition mb-8 ${p.highlight ? "bg-foreground text-background hover:bg-foreground/90" : "border border-border hover:bg-surface-elevated"}`}>
                {p.price === "Custom" ? "Talk to sales" : "Start free"}
              </button>
              <ul className="space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-ember mt-0.5">—</span>
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
    <section className="px-6 py-40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ember/[0.04] to-transparent" />
      <div className="mx-auto max-w-5xl text-center relative">
        <h2 className="text-display text-6xl md:text-8xl mb-8">
          Build something <br />
          <span className="italic text-muted-foreground">worth shipping.</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          The studio is open. Bring a prompt, a Figma frame, or just a feeling. Architeq takes it from there.
        </p>
        <a href="/auth" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-sm font-medium hover:bg-foreground/90 transition">
          Open the Studio
          <ArrowUpRight className="size-4" />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 px-6 py-16">
      <div className="mx-auto max-w-7xl grid md:grid-cols-5 gap-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="size-7 rounded-md bg-gradient-to-br from-ember to-violet" />
            <span className="text-display text-xl">Architeq</span>
          </div>
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
              {c.l.map((i) => <li key={i}><a href="#" className="hover:text-ember transition">{i}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-7xl mt-16 pt-8 border-t border-border/40 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground font-mono">
        <span>© 2026 Architeq AI Studio</span>
        <span>Built with Architeq · v0.9.2</span>
      </div>
    </footer>
  );
}
