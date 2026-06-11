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
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex relative items-end p-12 overflow-hidden border-r border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-ember/10 via-transparent to-violet/10" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ember/40 to-transparent" />
        <div className="relative">
          <Link to="/" className="text-display text-3xl mb-12 inline-block">Architeq</Link>
          <h1 className="text-display text-5xl leading-[0.95] mb-4">
            The studio is <br /><span className="italic text-muted-foreground">open.</span>
          </h1>
          <p className="text-muted-foreground max-w-md">
            Generate, edit, and ship agency-grade websites from a single prompt. Free during preview.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="md:hidden text-display text-2xl mb-8 inline-block">Architeq</Link>
          <h2 className="text-display text-3xl mb-2">
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
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-ember/60 transition"
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
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-ember/60 transition"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background px-4 py-3 text-sm font-medium hover:bg-foreground/90 transition disabled:opacity-50"
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
              className="text-foreground hover:text-ember transition underline-offset-4 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
