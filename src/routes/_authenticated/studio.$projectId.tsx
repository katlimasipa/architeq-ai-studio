import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject, generateSite } from "@/lib/projects.functions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Send, Loader2, Sparkles, Monitor, Smartphone,
  Code, Eye, Download, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studio/$projectId")({
  head: () => ({ meta: [{ title: "Studio — Architeq" }] }),
  component: Studio,
});

function Studio() {
  const { projectId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const get = useServerFn(getProject);
  const generate = useServerFn(generateSite);

  const [input, setInput] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => get({ data: { id: projectId } }),
  });

  const gen = useMutation({
    mutationFn: (msg: string) => generate({ data: { projectId, message: msg } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages, gen.isPending]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v || gen.isPending) return;
    setInput("");
    gen.mutate(v);
  }

  function download() {
    if (!data?.project.html) return;
    const blob = new Blob([data.project.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.project.name || "site"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openInNewTab() {
    if (!data?.project.html) return;
    const w = window.open("", "_blank");
    if (w) { w.document.write(data.project.html); w.document.close(); }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const html = data?.project.html ?? "";
  const messages = data?.messages ?? [];

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/60 shrink-0">
        <div className="px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.navigate({ to: "/dashboard" })}
              className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <Link to="/" className="hidden sm:flex items-center gap-2">
              <div className="size-6 rounded-md bg-gradient-to-br from-ember to-violet" />
            </Link>
            <span className="text-sm font-medium truncate">{data?.project.name}</span>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/40 p-1">
            <button
              onClick={() => setTab("preview")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${tab === "preview" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Eye className="size-3" /> Preview
            </button>
            <button
              onClick={() => setTab("code")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${tab === "code" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Code className="size-3" /> Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            {html && (
              <>
                <button onClick={openInNewTab} className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground" title="Open in new tab">
                  <ExternalLink className="size-4" />
                </button>
                <button onClick={download} className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground" title="Download HTML">
                  <Download className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[380px_1fr] min-h-0">
        {/* Chat */}
        <aside className="border-r border-border/40 flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && !gen.isPending && (
              <div className="text-center py-12">
                <div className="size-12 rounded-2xl bg-gradient-to-br from-ember/20 to-violet/20 border border-ember/30 mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="size-5 text-ember" />
                </div>
                <p className="text-display text-2xl mb-2">Start composing.</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Describe the site you want. Be specific about purpose, tone, and sections.
                </p>
                <div className="mt-6 space-y-2 text-left">
                  {[
                    "A premium SaaS landing for an AI inbox triage tool",
                    "Editorial portfolio for an interior designer in Tokyo",
                    "Modern pricing page for a developer API platform",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => setInput(p)}
                      className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-border bg-surface/40 hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "" : "text-muted-foreground"}>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  {m.role === "user" ? "You" : "Architeq"}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}

            {gen.isPending && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ember mb-1">Architeq</p>
                <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" /> Composing your site…
                </p>
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-border/40 p-3">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); }
                }}
                placeholder={html ? "Refine — change colors, add a section, rewrite copy…" : "Describe the site you want to build…"}
                rows={3}
                className="w-full resize-none bg-surface border border-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-ember/60 transition"
                disabled={gen.isPending}
              />
              <button
                type="submit"
                disabled={!input.trim() || gen.isPending}
                className="absolute bottom-3 right-3 size-8 rounded-lg bg-foreground text-background inline-flex items-center justify-center disabled:opacity-30 hover:bg-foreground/90 transition"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </form>
        </aside>

        {/* Preview / Code */}
        <section className="bg-surface/20 flex flex-col min-h-0">
          {tab === "preview" ? (
            <>
              <div className="border-b border-border/40 px-4 h-10 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">preview</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDevice("desktop")}
                    className={`p-1 rounded ${device === "desktop" ? "text-foreground" : "hover:text-foreground"}`}
                  ><Monitor className="size-3.5" /></button>
                  <button
                    onClick={() => setDevice("mobile")}
                    className={`p-1 rounded ${device === "mobile" ? "text-foreground" : "hover:text-foreground"}`}
                  ><Smartphone className="size-3.5" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
                {html ? (
                  <iframe
                    title="preview"
                    srcDoc={html}
                    sandbox="allow-scripts"
                    className={`bg-white rounded-lg shadow-2xl border border-border/40 transition-all ${device === "mobile" ? "w-[390px] h-[844px]" : "w-full h-full min-h-[800px]"}`}
                  />
                ) : (
                  <div className="m-auto text-center text-muted-foreground">
                    <Sparkles className="size-6 mx-auto mb-3 text-ember" />
                    <p className="text-display text-2xl mb-1">Your site appears here.</p>
                    <p className="text-sm">Send a prompt to begin.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-auto">
              <pre className="text-xs font-mono p-4 whitespace-pre-wrap break-words text-muted-foreground">
                {html || "// No code generated yet"}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
