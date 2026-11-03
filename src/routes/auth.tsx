import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Architeq" },
      { name: "description", content: "Sign in to your Architeq AI Studio account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) void navigate({ to: "/dashboard" });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      toast.success(mode === "signup" ? "Welcome to Architeq." : "Welcome back.");
      await navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(
        message.toLowerCase().includes("invalid login credentials")
          ? "Email or password didn’t match. Check your details and try again."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="app-frame flex min-h-[calc(100vh-24px)] overflow-hidden md:min-h-[calc(100vh-40px)]">
        <aside className="rail flex w-[4.25rem] shrink-0 flex-col items-center py-5 md:w-[5rem]">
          <Link
            to="/"
            className="flex size-11 items-center justify-center rounded-2xl bg-surface-elevated"
            aria-label="Architeq home"
          >
            <img src="/favicon.png" alt="" className="size-10 rounded-xl object-cover" />
          </Link>
        </aside>

        <main className="grid min-w-0 flex-1 bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)]">
          <section className="hidden flex-col justify-between border-r border-border/80 p-10 lg:flex xl:p-16">
            <div>
              <p className="mb-5 text-xs uppercase tracking-[0.2em] text-leaf">Your studio</p>
              <h1 className="text-display max-w-2xl text-5xl xl:text-7xl">
                Ideas into <span className="text-muted-foreground">beautiful things.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
                Build, refine, and publish polished websites from one calm, focused workspace.
              </p>
            </div>
            <div className="grid max-w-xl grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted/70 p-5">
                <p className="mb-2 text-xs text-muted-foreground">01 / Describe</p>
                <p className="text-sm font-medium">Start with the idea you have in mind.</p>
              </div>
              <div className="rounded-2xl bg-accent/70 p-5">
                <p className="mb-2 text-xs text-foreground/65">02 / Refine</p>
                <p className="text-sm font-medium">Make it yours, then publish it.</p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-md">
              <Link to="/" className="mb-8 inline-flex lg:hidden" aria-label="Architeq home">
                <img src="/architeq-logo.webp" alt="Architeq AI Studio" className="h-10 w-auto max-w-[170px] object-contain" />
              </Link>

              <div role="tablist" aria-label="Account access" className="mb-8 inline-flex rounded-full bg-muted p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  onClick={() => setMode("signin")}
                  className={`rounded-full px-5 py-2.5 text-sm transition ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  onClick={() => setMode("signup")}
                  className={`rounded-full px-5 py-2.5 text-sm transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Create account
                </button>
              </div>

              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-leaf">
                {mode === "signin" ? "Welcome back" : "A new workspace"}
              </p>
              <h2 className="text-display mb-2 text-4xl sm:text-5xl">
                {mode === "signin" ? "Sign in to your studio" : "Create your account"}
              </h2>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                {mode === "signin"
                  ? "Use the email and password for your existing Architeq account."
                  : "Start building in Architeq. No card required during preview."}
              </p>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-sm outline-none transition focus:border-foreground/45 focus:ring-2 focus:ring-accent/60"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="At least 6 characters"
                    className="w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-sm outline-none transition focus:border-foreground/45 focus:ring-2 focus:ring-accent/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <>
                    {mode === "signin" ? "Sign in" : "Create account"} <ArrowRight className="size-4" />
                  </>}
                </button>
              </form>

              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                {mode === "signin"
                  ? "Signing in opens your projects, saved skills, templates, and publishing connections."
                  : "Your projects and saved skills are private to your account."}
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
