import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, generateSite, togglePublic, restoreVersion, deletePage,
} from "@/lib/projects.functions";
import { pushToGithub, deployToVercel } from "@/lib/deployments.functions";
import { uploadAsset, deleteAsset } from "@/lib/assets.functions";
import { listSkills, createSkill, toggleProjectSkill, deleteSkill } from "@/lib/skills.functions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Send, Loader2, Sparkles, Monitor, Smartphone,
  Code, Eye, Download, ExternalLink, Upload, Image as ImageIcon,
  Trash2, History, Share2, Check, Copy, Wand2, Plus, X, Zap,
  FileCode, Rocket, Github, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/studio/$projectId")({
  head: () => ({ meta: [{ title: "Studio — Architeq" }] }),
  component: Studio,
});

type Panel = null | "assets" | "skills" | "versions" | "share" | "pages" | "deploy";

function Studio() {
  const { projectId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const get = useServerFn(getProject);
  const generate = useServerFn(generateSite);
  const tPub = useServerFn(togglePublic);
  const restore = useServerFn(restoreVersion);
  const upload = useServerFn(uploadAsset);
  const delAsset = useServerFn(deleteAsset);
  const listSk = useServerFn(listSkills);
  const createSk = useServerFn(createSkill);
  const toggleSk = useServerFn(toggleProjectSkill);
  const delSk = useServerFn(deleteSkill);
  const delPage = useServerFn(deletePage);
  const ghPush = useServerFn(pushToGithub);
  const vercelDeploy = useServerFn(deployToVercel);

  const [input, setInput] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [panel, setPanel] = useState<Panel>(null);
  const [previewPath, setPreviewPath] = useState<string>("/");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => get({ data: { id: projectId } }),
  });

  const { data: allSkills } = useQuery({
    queryKey: ["skills"], queryFn: () => listSk(), enabled: panel === "skills",
  });

  const gen = useMutation({
    mutationFn: (msg: string) => generate({ data: { projectId, message: msg } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Site updated — v${r.version}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const pubMut = useMutation({
    mutationFn: (v: boolean) => tPub({ data: { id: projectId, is_public: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const restoreMut = useMutation({
    mutationFn: (versionId: string) => restore({ data: { projectId, versionId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Version restored");
    },
  });

  const uploadMut = useMutation({
    mutationFn: async (file: { name: string; type: string; b64: string; kind: "logo" | "reference" | "image" }) =>
      upload({ data: { projectId, kind: file.kind, name: file.name, contentType: file.type, dataBase64: file.b64 } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Asset uploaded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const delAssetMut = useMutation({
    mutationFn: (id: string) => delAsset({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const toggleSkMut = useMutation({
    mutationFn: ({ skillId, active }: { skillId: string; active: boolean }) =>
      toggleSk({ data: { projectId, skillId, active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const createSkMut = useMutation({
    mutationFn: (d: { name: string; description: string; instructions: string }) => createSk({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const delSkMut = useMutation({
    mutationFn: (id: string) => delSk({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });

  const delPageMut = useMutation({
    mutationFn: (path: string) => delPage({ data: { projectId, path } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Page deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const ghMut = useMutation({
    mutationFn: (opts: { repoName?: string; isPrivate: boolean }) =>
      ghPush({ data: { projectId, repoName: opts.repoName, isPrivate: opts.isPrivate } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Pushed to GitHub — ${r.repoFullName}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "GitHub push failed"),
  });

  const vercelMut = useMutation({
    mutationFn: () => vercelDeploy({ data: { projectId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Deployed to Vercel");
      window.open(r.url, "_blank");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Vercel deploy failed"),
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

  async function handleFile(file: File, kind: "logo" | "reference" | "image") {
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8MB"); return; }
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    uploadMut.mutate({ name: file.name, type: file.type || "application/octet-stream", b64, kind });
  }

  function download() {
    if (!data?.project.html) return;
    const blob = new Blob([data.project.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.project.name || "site"}.html`; a.click();
    URL.revokeObjectURL(url);
  }

  function openInNewTab() {
    if (data?.project.slug) window.open(`/p/${data.project.slug}`, "_blank");
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
  const assets = data?.assets ?? [];
  const versions = data?.versions ?? [];
  const activeSkills = data?.activeSkills ?? [];
  const pages = data?.pages ?? [];
  const slug = data?.project.slug ?? "";
  const isPublic = data?.project.is_public ?? true;
  const project = data?.project as any;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;
  const previewSrc = isPublic && slug ? `/p/${slug}${previewPath === "/" ? "" : previewPath}` : null;

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
            {data?.project.version ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">v{data.project.version}</span>
            ) : null}
            {activeSkills.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-ember border border-ember/30 rounded-full px-2 py-0.5">
                <Zap className="size-3" /> {activeSkills.length} skill{activeSkills.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/40 p-1">
            <button onClick={() => setTab("preview")} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${tab === "preview" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              <Eye className="size-3" /> Preview
            </button>
            <button onClick={() => setTab("code")} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${tab === "code" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              <Code className="size-3" /> Code
            </button>
          </div>

          <div className="flex items-center gap-1">
            <PanelBtn icon={<FileCode className="size-4" />} label="Pages" active={panel === "pages"} onClick={() => setPanel(panel === "pages" ? null : "pages")} badge={pages.length || (html ? 1 : 0)} />
            <PanelBtn icon={<ImageIcon className="size-4" />} label="Assets" active={panel === "assets"} onClick={() => setPanel(panel === "assets" ? null : "assets")} badge={assets.length} />
            <PanelBtn icon={<Wand2 className="size-4" />} label="Skills" active={panel === "skills"} onClick={() => setPanel(panel === "skills" ? null : "skills")} badge={activeSkills.length} />
            <PanelBtn icon={<History className="size-4" />} label="Versions" active={panel === "versions"} onClick={() => setPanel(panel === "versions" ? null : "versions")} badge={versions.length} />
            <PanelBtn icon={<Share2 className="size-4" />} label="Share" active={panel === "share"} onClick={() => setPanel(panel === "share" ? null : "share")} />
            <PanelBtn icon={<Rocket className="size-4" />} label="Deploy" active={panel === "deploy"} onClick={() => setPanel(panel === "deploy" ? null : "deploy")} />
            {html && (
              <>
                <button onClick={openInNewTab} className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground" title="Open live preview">
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

      <div className="flex-1 grid md:grid-cols-[340px_1fr_auto] min-h-0">
        {/* Chat */}
        <aside className="border-r border-border/40 flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && !gen.isPending && (
              <div className="text-center py-8">
                <div className="size-12 rounded-2xl bg-gradient-to-br from-ember/20 to-violet/20 border border-ember/30 mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="size-5 text-ember" />
                </div>
                <p className="text-display text-2xl mb-2">Start composing.</p>
                <p className="text-sm text-muted-foreground mx-auto mb-5">
                  Describe the site. Upload logos & references in the Assets panel — they persist across every edit.
                </p>
                <div className="space-y-2 text-left">
                  {[
                    "A premium SaaS landing for an AI inbox triage tool",
                    "Editorial portfolio for an interior designer in Tokyo",
                    "Modern pricing page for a developer API platform",
                  ].map((p) => (
                    <button key={p} onClick={() => setInput(p)} className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-border bg-surface/40 hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition">
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
                placeholder={html ? "Refine — change colors, add a section, rewrite copy…" : "Describe the site you want to build…"}
                rows={3}
                className="w-full resize-none bg-surface border border-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-ember/60 transition"
                disabled={gen.isPending}
              />
              <button type="submit" disabled={!input.trim() || gen.isPending} className="absolute bottom-3 right-3 size-8 rounded-lg bg-foreground text-background inline-flex items-center justify-center disabled:opacity-30 hover:bg-foreground/90 transition">
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
                <span className="font-mono">{slug ? `/p/${slug}` : "preview"}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDevice("desktop")} className={`p-1 rounded ${device === "desktop" ? "text-foreground" : "hover:text-foreground"}`}><Monitor className="size-3.5" /></button>
                  <button onClick={() => setDevice("mobile")} className={`p-1 rounded ${device === "mobile" ? "text-foreground" : "hover:text-foreground"}`}><Smartphone className="size-3.5" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
                {html ? (
                  <iframe
                    title="preview"
                    srcDoc={html}
                    sandbox="allow-scripts allow-same-origin allow-forms"
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

        {/* Side panel */}
        {panel && (
          <aside className="w-[360px] border-l border-border/40 bg-background/80 backdrop-blur-xl overflow-y-auto">
            <div className="p-4 flex items-center justify-between border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{panel}</p>
              <button onClick={() => setPanel(null)} className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4">
              {panel === "assets" && (
                <AssetsPanel
                  assets={assets}
                  onUpload={handleFile}
                  onDelete={(id) => delAssetMut.mutate(id)}
                  uploading={uploadMut.isPending}
                />
              )}
              {panel === "skills" && (
                <SkillsPanel
                  all={allSkills ?? []}
                  active={activeSkills}
                  onToggle={(id, a) => toggleSkMut.mutate({ skillId: id, active: a })}
                  onCreate={(d) => createSkMut.mutate(d)}
                  onDelete={(id) => delSkMut.mutate(id)}
                />
              )}
              {panel === "versions" && (
                <VersionsPanel versions={versions} onRestore={(id) => restoreMut.mutate(id)} restoring={restoreMut.isPending} />
              )}
              {panel === "share" && (
                <SharePanel
                  shareUrl={shareUrl}
                  isPublic={data?.project.is_public ?? true}
                  onTogglePublic={(v) => pubMut.mutate(v)}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function PanelBtn({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative p-1.5 rounded-md transition ${active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}
    >
      {icon}
      {badge ? (
        <span className="absolute -top-1 -right-1 text-[9px] font-mono bg-ember text-background rounded-full size-4 flex items-center justify-center">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function AssetsPanel({ assets, onUpload, onDelete, uploading }: {
  assets: any[]; onUpload: (f: File, kind: "logo" | "reference" | "image") => void; onDelete: (id: string) => void; uploading: boolean;
}) {
  const [kind, setKind] = useState<"logo" | "reference" | "image">("logo");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Upload logos, references, and brand images. The AI will use them directly in every generation — never substituted with placeholders.
      </p>
      <div className="flex gap-1 p-1 rounded-lg border border-border bg-surface/40">
        {(["logo", "reference", "image"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`flex-1 text-xs py-1.5 rounded capitalize ${kind === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{k}</button>
        ))}
      </div>
      <label className={`block border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-ember/60 transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
        <Upload className="size-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm">{uploading ? "Uploading…" : `Upload ${kind}`}</p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WebP — max 8MB</p>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; if (f) onUpload(f, kind);
          e.target.value = "";
        }} />
      </label>
      <div className="space-y-2">
        {assets.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No assets yet.</p>}
        {assets.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/60 bg-surface/40 group">
            <img src={a.url} alt={a.name} className="size-10 rounded object-cover bg-white" />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{a.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-ember">{a.kind}</p>
            </div>
            <button onClick={() => onDelete(a.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsPanel({ all, active, onToggle, onCreate, onDelete }: {
  all: any[]; active: any[]; onToggle: (id: string, active: boolean) => void;
  onCreate: (d: { name: string; description: string; instructions: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", instructions: "" });
  const activeIds = new Set(active.map((s) => s.id));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Reusable instruction packs — stack any combination. Active skills are injected into every generation for this project.
      </p>
      <button onClick={() => setCreating(!creating)} className="w-full inline-flex items-center justify-center gap-2 text-xs py-2 rounded-lg border border-border hover:border-ember/60 transition">
        {creating ? <X className="size-3.5" /> : <Plus className="size-3.5" />} {creating ? "Cancel" : "New skill"}
      </button>
      {creating && (
        <div className="space-y-2 p-3 rounded-lg border border-ember/30 bg-surface/40">
          <input placeholder="Skill name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs" />
          <input placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs" />
          <textarea placeholder="Instructions (rules, patterns, standards the AI should follow)" rows={6} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs resize-none" />
          <button
            onClick={() => { if (form.name && form.instructions.length >= 20) { onCreate(form); setForm({ name: "", description: "", instructions: "" }); setCreating(false); } else { toast.error("Name + 20+ char instructions required"); } }}
            className="w-full bg-foreground text-background text-xs py-1.5 rounded"
          >Create</button>
        </div>
      )}
      <div className="space-y-2">
        {all.map((s) => {
          const isActive = activeIds.has(s.id);
          return (
            <div key={s.id} className={`p-3 rounded-lg border transition ${isActive ? "border-ember/60 bg-ember/5" : "border-border/60 bg-surface/40"}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {s.name}
                    {s.is_global && <span className="text-[9px] uppercase tracking-wider text-ember">Built-in</span>}
                  </p>
                  {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                </div>
                <button
                  onClick={() => onToggle(s.id, !isActive)}
                  className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded ${isActive ? "bg-ember text-background" : "border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {isActive ? <span className="inline-flex items-center gap-1"><Check className="size-3" /> On</span> : "Off"}
                </button>
              </div>
              {!s.is_global && (
                <button onClick={() => onDelete(s.id)} className="text-[10px] text-muted-foreground hover:text-destructive mt-1">Delete</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VersionsPanel({ versions, onRestore, restoring }: { versions: any[]; onRestore: (id: string) => void; restoring: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Every generation is snapshotted. Restore any previous version instantly.
      </p>
      {versions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No versions yet.</p>}
      <div className="space-y-2">
        {versions.map((v) => (
          <div key={v.id} className="p-3 rounded-lg border border-border/60 bg-surface/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono">v{v.version}</span>
              <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(v.created_at))} ago</span>
            </div>
            {v.prompt && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{v.prompt}</p>}
            <button
              onClick={() => onRestore(v.id)}
              disabled={restoring}
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-border hover:border-ember/60 hover:text-ember transition disabled:opacity-50"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SharePanel({ shareUrl, isPublic, onTogglePublic }: { shareUrl: string; isPublic: boolean; onTogglePublic: (v: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        A live, shareable preview URL. Send it to clients — no account needed.
      </p>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Public preview link</label>
        <div className="flex gap-2">
          <input readOnly value={shareUrl} className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono" />
          <button onClick={copy} className="shrink-0 px-3 rounded-lg bg-foreground text-background text-xs inline-flex items-center gap-1">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface/40 cursor-pointer">
        <div>
          <p className="text-sm">Public preview</p>
          <p className="text-xs text-muted-foreground">Anyone with the link can view</p>
        </div>
        <input type="checkbox" checked={isPublic} onChange={(e) => onTogglePublic(e.target.checked)} className="size-4 accent-ember" />
      </label>
      <a href={shareUrl} target="_blank" rel="noreferrer" className="block text-center text-xs text-ember hover:underline">
        Open preview in new tab →
      </a>
    </div>
  );
}
