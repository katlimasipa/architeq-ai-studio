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
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
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
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-5 flex items-center">
      <div className="app-frame w-full grid md:grid-cols-[1.1fr_1fr] overflow-hidden min-h-[calc(100vh-24px)] md:min-h-[calc(100vh-40px)]">
        {/* Dark brand panel */}
        <div className="hidden md:flex bg-primary text-primary-foreground relative flex-col justify-between p-12">
          <div className="absolute bottom-[-160px] right-[-160px] size-[420px] rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <Link to="/" className="flex items-center gap-2.5 relative">
            <img src="/favicon.png" alt="" className="size-9 rounded-xl object-cover" />
            <span className="text-display text-xl">Architeq</span>
          </Link>
          <div className="relative">
            <span className="inline-block rounded-full bg-accent text-accent-foreground text-xs font-medium px-3 py-1 mb-6">
              Free during preview
            </span>
            <h1 className="text-display text-6xl leading-[0.98] mb-4">
              The studio is <br />open.
            </h1>
            <p className="text-primary-foreground/70 max-w-md text-lg leading-relaxed">
              Generate, edit, and ship agency-grade websites from a single prompt.
            </p>
          </div>
          <p className="text-xs font-mono text-primary-foreground/40 relative">
            › plan → generate → deploy
          </p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <Link to="/" className="md:hidden flex items-center gap-2 mb-10">
              <img src="/architeq-logo.webp" alt="Architeq AI Studio" className="h-11 w-auto max-w-[180px] object-contain" />
            </Link>
            <h2 className="text-display text-4xl mb-2">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              {mode === "signup" ? "Free tier. No card required." : "Sign in to continue building."}
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-surface-elevated border border-border rounded-full px-5 py-3 text-sm focus:outline-none focus:border-foreground/40 transition"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="w-full bg-surface-elevated border border-border rounded-full px-5 py-3 text-sm focus:outline-none focus:border-foreground/40 transition"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <>
                  {mode === "signup" ? "Create account" : "Sign in"} <ArrowRight className="size-4" />
                </>}
              </button>
            </form>

            <p className="text-sm text-muted-foreground mt-8 text-center">
              {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
              <button
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="text-foreground hover:text-leaf transition underline-offset-4 hover:underline"
              >
                {mode === "signup" ? "Sign in" : "Create account"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
