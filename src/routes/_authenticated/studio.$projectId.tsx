import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, generateSite, togglePublic, restoreVersion, deletePage,
} from "@/lib/projects.functions";
import type { GenerateSiteProgress, GenerateSiteResult } from "@/lib/projects.functions";
import { pushToGithub, deployToVercel } from "@/lib/deployments.functions";
import { uploadAsset, deleteAsset } from "@/lib/assets.functions";
import { listSkills, createSkill, toggleProjectSkill, deleteSkill } from "@/lib/skills.functions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Send, Loader2, Sparkles, Monitor, Smartphone,
  Code, Eye, Download, ExternalLink, Upload, Image as ImageIcon, Paperclip,
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
type SkillCommandOption = { id: string; name: string; slug: string; description: string };
type PendingAttachment = { id: string; file: File; kind: "reference" | "image"; dataUrl: string };
type ChatAttachment = { name: string; kind: "reference" | "image"; dataUrl: string };
const MAX_ATTACHMENTS = 6;

function Studio() {
  const { user } = Route.useRouteContext();
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
  const [slashMenu, setSlashMenu] = useState(false);
  const [slashTerm, setSlashTerm] = useState("");
  const [slashStart, setSlashStart] = useState(0);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<GenerateSiteProgress | null>(null);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState<{ content: string; baselineMessages: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialPromptStarted = useRef<string | null>(null);
  const syncedVersion = useRef<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project", user.id, projectId],
    queryFn: () => get({ data: { id: projectId } }),
  });

  const { data: allSkills } = useQuery({
    queryKey: ["skills", user.id], queryFn: () => listSk(),
  });

  const gen = useMutation({
    mutationFn: async (payload: { message: string; text: string; attachments?: ChatAttachment[] }) => {
      const stream = await generate({ data: { projectId, message: payload.message, attachments: payload.attachments } });
      const reader = stream.getReader();
      let result: GenerateSiteResult | null = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value.type === "progress") {
            setGenerationProgress(value.progress);
          } else if (value.type === "complete") {
            result = value.result;
            setGenerationProgress({ step: 5, title: "Preview updated", detail: "Your latest version is ready." });
          } else {
            throw new Error(value.message);
          }
        }
      } finally {
        reader.releaseLock();
      }
      if (!result) throw new Error("Generation ended before the preview was saved. Try again.");
      return result;
    },
    onMutate: (payload) => {
      setSubmittedPrompt({ content: payload.text, baselineMessages: data?.messages.length ?? 0 });
      setGenerationStartedAt(Date.now());
      setGenerationProgress({
        step: 1,
        title: "Starting your build",
        detail: "Checking the project and preparing its saved context.",
      });
    },
    onSuccess: async (r) => {
      setGenerationProgress({ step: 5, title: "Preview updated", detail: "Your latest version is ready." });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["project", user.id, projectId] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
      ]);
      setSubmittedPrompt(null);
      setGenerationProgress(null);
      setGenerationStartedAt(null);
      toast.success(`Site updated — v${r.version}`);
    },
    onError: (e, payload) => {
      setInput((current) => current || payload.text);
      setGenerationProgress(null);
      setGenerationStartedAt(null);
      toast.error(e instanceof Error ? e.message : "Generation failed");
    },
  });
  const generateMutate = gen.mutate;

  useEffect(() => {
    const prompt = data?.project.prompt?.trim();
    if (!data || !prompt || data.messages.length > 0 || initialPromptStarted.current === projectId) return;

    initialPromptStarted.current = projectId;
    generateMutate(prompt);
  }, [data, generateMutate, projectId]);

  const pubMut = useMutation({
    mutationFn: (v: boolean) => tPub({ data: { id: projectId, is_public: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", user.id, projectId] }),
  });

  const restoreMut = useMutation({
    mutationFn: (versionId: string) => restore({ data: { projectId, versionId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", user.id, projectId] });
      toast.success("Version restored");
    },
  });

  const uploadMut = useMutation({
    mutationFn: async (file: { name: string; type: string; b64: string; kind: "logo" | "reference" | "image" }) =>
      upload({ data: { projectId, kind: file.kind, name: file.name, contentType: file.type, dataBase64: file.b64 } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", user.id, projectId] });
      toast.success("Asset uploaded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const delAssetMut = useMutation({
    mutationFn: (id: string) => delAsset({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", user.id, projectId] }),
  });

  const toggleSkMut = useMutation({
    mutationFn: ({ skillId, active }: { skillId: string; active: boolean }) =>
      toggleSk({ data: { projectId, skillId, active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", user.id, projectId] }),
  });

  const createSkMut = useMutation({
    mutationFn: (d: { name: string; description: string; instructions: string }) => createSk({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills", user.id] });
      toast.success("Skill created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const delSkMut = useMutation({
    mutationFn: (id: string) => delSk({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills", user.id] }),
  });

  const delPageMut = useMutation({
    mutationFn: (path: string) => delPage({ data: { projectId, path } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", user.id, projectId] });
      toast.success("Page deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const ghMut = useMutation({
    mutationFn: (opts: { repoName?: string; isPrivate: boolean }) =>
      ghPush({ data: { projectId, repoName: opts.repoName, isPrivate: opts.isPrivate } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["project", user.id, projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Pushed to GitHub — ${r.repoFullName}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "GitHub push failed"),
  });

  const vercelMut = useMutation({
    mutationFn: () => vercelDeploy({ data: { projectId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["project", user.id, projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Deployed to Vercel — ${r.url}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Vercel deploy failed"),
  });
  const pushGithubMutate = ghMut.mutate;
  const deployVercelMutate = vercelMut.mutate;

  useEffect(() => {
    const version = gen.data?.version;
    if (!gen.isSuccess || !version || !data?.project || syncedVersion.current === version) return;
    const hasGithub = Boolean(data.project.github_repo || data.project.github_url);
    const hasVercel = Boolean(data.project.vercel_url || data.project.vercel_project_id);
    if (!hasGithub && !hasVercel) return;
    syncedVersion.current = version;
    if (hasGithub) pushGithubMutate({ repoName: data.project.github_repo?.split("/").at(-1), isPrivate: true });
    if (hasVercel) deployVercelMutate();
  }, [data?.project, gen.data?.version, gen.isSuccess, pushGithubMutate, deployVercelMutate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages, gen.isPending, submittedPrompt]);

  useEffect(() => {
    if (!generationStartedAt) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - generationStartedAt) / 1000));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [generationStartedAt]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (gen.isPending) return;
    const text = input.trim();
    if (!text && pending.length === 0) return;
    const files = pending;
    setInput("");
    setPending([]);
    setSlashMenu(false);
    const notes: string[] = [];
    let cursor = 0;
    try {
      for (; cursor < files.length; cursor++) {
        const p = files[cursor];
        const buf = await p.file.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        const row = await upload({
          data: {
            projectId,
            kind: p.kind,
            name: p.file.name,
            contentType: p.file.type || "application/octet-stream",
            dataBase64: btoa(bin),
          },
        });
        notes.push(
          p.kind === "reference"
            ? `- DESIGN REFERENCE "${p.file.name}" — study this image as visual inspiration for layout, typography, spacing, colour and component style (visible in this message)`
            : `- SITE IMAGE "${p.file.name}" — embed this exact URL in the site where appropriate: ${row.url}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setInput(text);
      setPending((cur) => [...files.slice(cursor), ...cur]);
      return;
    }
    const label = text || "Use the attached files in the site.";
    const message = notes.length ? `${label}\n\nATTACHED FILES:\n${notes.join("\n")}` : label;
    gen.mutate({
      message,
      text: label,
      attachments: files.map((p) => ({ name: p.file.name, kind: p.kind, dataUrl: p.dataUrl })),
    });
  }

  async function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) { toast.error("Only image files can be attached"); return; }
    if (incoming.length + pending.length > MAX_ATTACHMENTS) toast.error(`Max ${MAX_ATTACHMENTS} attachments per message`);
    const room = Math.max(0, MAX_ATTACHMENTS - pending.length);
    for (const file of incoming.slice(0, room)) {
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} is over 8MB`); continue; }
      const dataUrl = await buildDataUrl(file);
      if (!dataUrl) { toast.error(`Couldn't process ${file.name} — try a smaller image`); continue; }
      setPending((cur) => (cur.length >= MAX_ATTACHMENTS ? cur : [...cur, { id: crypto.randomUUID(), file, kind: "reference", dataUrl }]));
    }
  }

  async function buildDataUrl(file: File): Promise<string | null> {
    const LIMIT = 3_800_000;
    const readAsDataUrl = () => new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read failed"));
      r.readAsDataURL(file);
    });
    if (file.size <= 512 * 1024) {
      const url = await readAsDataUrl();
      return url.length <= LIMIT ? url : null;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { bitmap.close(); return null; }
      if (file.type !== "image/jpeg") {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      }
      bitmap.close();
      let out = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
      if (out.length > LIMIT) out = canvas.toDataURL("image/jpeg", 0.8);
      return out.length <= LIMIT ? out : null;
    } catch {
      try {
        const url = await readAsDataUrl();
        return url.length <= LIMIT ? url : null;
      } catch {
        return null;
      }
    }
  }

  function updateInput(value: string, caret: number) {
    setInput(value);
    const match = value.slice(0, caret).match(/(?:^|\s)\/{1,2}([a-z0-9-]*)$/i);
    if (!match) { setSlashMenu(false); return; }
    setSlashStart(caret - match[0].length + match[0].search(/\/{1,2}/));
    setSlashTerm(match[1].toLowerCase());
    setSlashHighlight(0);
    setSlashMenu(true);
  }

  function chooseSkill(skill: SkillCommandOption) {
    const before = input.slice(0, slashStart);
    const after = inputRef.current?.value.slice(inputRef.current.selectionStart) ?? "";
    const next = `${before}/${skill.slug} ${after}`;
    const caret = before.length + skill.slug.length + 2;
    setInput(next);
    setSlashMenu(false);
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(caret, caret); });
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
  const isPublic = data?.project.is_public ?? false;
  const project = data?.project as any;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;
  const previewSrc = isPublic && slug ? `/p/${slug}${previewPath === "/" ? "" : previewPath}` : null;
  const pinnedSkillIds = new Set(activeSkills.map((skill: { id: string }) => skill.id));
  const filteredSkills = (allSkills ?? []).filter((skill) => `${skill.name} ${skill.slug}`.toLowerCase().includes(slashTerm))
    .sort((a, b) => Number(pinnedSkillIds.has(b.id)) - Number(pinnedSkillIds.has(a.id)))
    .slice(0, 8);
  const showSubmittedPrompt = submittedPrompt && messages.length <= submittedPrompt.baselineMessages;
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const generationSteps = ["Load project context", "Generate site", "Check pages", "Save preview"];

  return (
    <div className="h-screen bg-background p-3">
      <div className="app-frame h-full flex flex-col overflow-hidden">
      <header className="border-b border-border bg-surface/90 shrink-0">
        <div className="px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.navigate({ to: "/dashboard" })}
              className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <Link to="/" className="hidden sm:flex items-center gap-2">
              <img src="/favicon.png" alt="Architeq home" className="size-8 rounded-lg object-cover" />
            </Link>
            <span className="text-sm font-medium truncate">{data?.project.name}</span>
            {data?.project.version ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">v{data.project.version}</span>
            ) : null}
            {activeSkills.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-leaf border border-ember/30 rounded-full px-2 py-0.5">
                <Zap className="size-3" /> {activeSkills.length} pinned
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/40 p-1">
            <button onClick={() => setTab("preview")} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${tab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Eye className="size-3" /> Preview
            </button>
            <button onClick={() => setTab("code")} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${tab === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Code className="size-3" /> Code
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Link to="/skills" className="hidden rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground lg:inline-flex">Skill library</Link>
            <PanelBtn icon={<FileCode className="size-4" />} label="Pages" active={panel === "pages"} onClick={() => setPanel(panel === "pages" ? null : "pages")} badge={pages.length || (html ? 1 : 0)} />
            <PanelBtn icon={<ImageIcon className="size-4" />} label="Assets" active={panel === "assets"} onClick={() => setPanel(panel === "assets" ? null : "assets")} badge={assets.length} />
            <PanelBtn icon={<Wand2 className="size-4" />} label="Skills" active={panel === "skills"} onClick={() => setPanel(panel === "skills" ? null : "skills")} badge={activeSkills.length} />
            <PanelBtn icon={<History className="size-4" />} label="Versions" active={panel === "versions"} onClick={() => setPanel(panel === "versions" ? null : "versions")} badge={versions.length} />
            <PanelBtn icon={<Share2 className="size-4" />} label="Share" active={panel === "share"} onClick={() => setPanel(panel === "share" ? null : "share")} />
            <PanelBtn icon={<Rocket className="size-4" />} label="Deploy" active={panel === "deploy"} onClick={() => setPanel(panel === "deploy" ? null : "deploy")} />
            {html && (
              <>
                {isPublic && <button onClick={openInNewTab} className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground" title="Open live preview">
                  <ExternalLink className="size-4" />
                </button>}
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
                <div className="size-12 rounded-2xl bg-accent/20 border border-accent/40 mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="size-5 text-leaf" />
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
                {m.role === "user" ? (
                  <PromptMessage content={m.content} onReuse={(prompt) => {
                    setInput(prompt);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                )}
              </div>
            ))}

            {showSubmittedPrompt && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">You</p>
                <PromptMessage content={submittedPrompt.content} onReuse={(prompt) => {
                  setInput(prompt);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }} disabled={gen.isPending} />
              </div>
            )}

            {gen.isPending && (
              <div role="status" aria-live="polite" className="rounded-2xl border border-accent/50 bg-surface-elevated p-3">
                <div className="flex items-start gap-2">
                  {generationProgress?.step === 5 ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-leaf" />
                  ) : (
                    <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-leaf" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{generationProgress?.title ?? "Working on your site"}</p>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{elapsedLabel}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {generationProgress?.detail ?? "Waiting for the project update."}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2">
                  {generationSteps.map((label, index) => {
                    const step = generationProgress?.step ?? 1;
                    const completed = step === 5 || index + 1 < step;
                    const active = step < 5 && index + 1 === step;
                    return (
                      <div key={label} className="flex items-center justify-between gap-2 text-[10px]">
                        <span className={`inline-flex items-center gap-1.5 ${completed || active ? "text-foreground" : "text-muted-foreground"}`}>
                          {completed ? <Check className="size-3 text-leaf" /> : active ? <Loader2 className="size-3 animate-spin text-leaf" /> : <span className="ml-0.5 mr-0.5 size-2 rounded-full border border-border" />}
                          {label}
                        </span>
                        <span className="text-muted-foreground">{completed ? "Done" : active ? "In progress" : "Waiting"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {gen.isError && (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-surface p-3">
                <p className="text-sm text-destructive">Your project is saved, but generation didn’t finish.</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gen.error instanceof Error ? gen.error.message : "Your prompt is ready below. Review it and try again."}</p>
                {gen.error instanceof Error && gen.error.message.includes("GEMINI_API_KEY") && (
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-leaf hover:underline"
                  >
                    Get a Gemini API key
                  </a>
                )}
                {gen.variables && (
                  <button
                    type="button"
                    onClick={() => generateMutate(gen.variables)}
                    className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-elevated transition"
                  >
                    Retry build
                  </button>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={submit}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="border-t border-border/40 p-3"
          >
            {pending.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pending.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 p-1 pr-2">
                    <img src={p.dataUrl} alt={p.file.name} className="size-9 rounded object-cover" />
                    <div className="min-w-0">
                      <p className="max-w-[120px] truncate text-[11px]">{p.file.name}</p>
                      <button
                        type="button"
                        onClick={() => setPending((cur) => cur.map((c) => (c.id === p.id ? { ...c, kind: c.kind === "reference" ? "image" : "reference" } : c)))}
                        className="text-[9px] uppercase tracking-wider text-leaf hover:underline"
                        title="Toggle between design reference (inspiration) and site image (placed on the site)"
                      >
                        {p.kind === "reference" ? "reference" : "site image"}
                      </button>
                    </div>
                    <button type="button" onClick={() => setPending((cur) => cur.filter((c) => c.id !== p.id))} className="p-0.5 text-muted-foreground hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              {slashMenu && filteredSkills.length > 0 && (
                <div role="listbox" aria-label="Skills" className="absolute bottom-full left-0 z-20 mb-2 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-surface-elevated p-2 shadow-xl">
                  <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Invoke a skill</p>
                  {filteredSkills.map((skill, index) => <button key={skill.id} type="button" role="option" aria-selected={slashHighlight === index} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseSkill(skill)} className={`block w-full rounded-xl px-3 py-2 text-left ${slashHighlight === index ? "bg-accent/50" : "hover:bg-muted"}`}>
                    <span className="flex items-center justify-between gap-2 text-sm font-medium"><span>{skill.name}</span><code className="text-xs text-muted-foreground">/{skill.slug}</code></span>
                    {skill.description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{skill.description}</span>}
                  </button>)}
                </div>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => updateInput(e.target.value, e.currentTarget.selectionStart)}
                onKeyDown={(e) => {
        if (slashMenu && filteredSkills.length && e.key === "ArrowDown") { e.preventDefault(); setSlashHighlight((n) => (n + 1) % filteredSkills.length); return; }
                  if (slashMenu && filteredSkills.length && e.key === "ArrowUp") { e.preventDefault(); setSlashHighlight((n) => (n - 1 + filteredSkills.length) % filteredSkills.length); return; }
                  if (slashMenu && e.key === "Escape") { e.preventDefault(); setSlashMenu(false); return; }
                  if (slashMenu && filteredSkills.length && e.key === "Enter") { e.preventDefault(); chooseSkill(filteredSkills[slashHighlight]); return; }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); }
                }}
                placeholder={html ? "Refine — change colors, add a section, rewrite copy…" : "Describe the site you want to build…"}
                rows={3}
                className="w-full resize-none bg-surface border border-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-ember/60 transition"
                disabled={gen.isPending}
              />
              <button type="submit" disabled={!input.trim() || gen.isPending} className="absolute bottom-3 right-3 size-8 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition">
                <Send className="size-3.5" />
              </button>
            </div>
          </form>
        </aside>

        {/* Preview / Code */}
        <section className="bg-muted/50 flex flex-col min-h-0">
          {tab === "preview" ? (
            <>
              <div className="border-b border-border/40 px-4 h-10 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono truncate">{slug ? `/p/${slug}${previewPath === "/" ? "" : previewPath}` : "preview"}</span>
                {pages.length > 1 && (
                  <select
                    value={previewPath}
                    onChange={(e) => setPreviewPath(e.target.value)}
                    className="bg-surface border border-border rounded px-2 py-0.5 text-xs"
                  >
                    {pages.map((p) => (
                      <option key={p.path} value={p.path}>{p.path}{p.title ? ` — ${p.title}` : ""}</option>
                    ))}
                  </select>
                )}
                {!isPublic && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-500 border border-amber-500/30 rounded-full px-2 py-0.5">private — links inactive</span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => setDevice("desktop")} className={`p-1 rounded ${device === "desktop" ? "text-foreground" : "hover:text-foreground"}`}><Monitor className="size-3.5" /></button>
                  <button onClick={() => setDevice("mobile")} className={`p-1 rounded ${device === "mobile" ? "text-foreground" : "hover:text-foreground"}`}><Smartphone className="size-3.5" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
                {html ? (
                  previewSrc ? (
                    <iframe
                      key={previewSrc}
                      title="preview"
                      src={previewSrc}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      className={`bg-white rounded-lg shadow-2xl border border-border/40 transition-all ${device === "mobile" ? "w-[390px] h-[844px]" : "w-full h-full min-h-[800px]"}`}
                    />
                  ) : (
                    <iframe
                      title="preview"
                      srcDoc={html}
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      className={`bg-white rounded-lg shadow-2xl border border-border/40 transition-all ${device === "mobile" ? "w-[390px] h-[844px]" : "w-full h-full min-h-[800px]"}`}
                    />
                  )
                ) : (
                  <div className="m-auto text-center text-muted-foreground">
                    <Sparkles className="size-6 mx-auto mb-3 text-leaf" />
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
          <aside className="w-[360px] border-l border-border/40 bg-surface overflow-y-auto">
            <div className="p-4 flex items-center justify-between border-b border-border/40 sticky top-0 bg-surface z-10">
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
                  isPublic={data?.project.is_public ?? false}
                  onTogglePublic={(v) => pubMut.mutate(v)}
                />
              )}
              {panel === "pages" && (
                <PagesPanel
                  pages={pages}
                  currentPath={previewPath}
                  onSelect={(p) => { setPreviewPath(p); setTab("preview"); }}
                  onDelete={(p) => delPageMut.mutate(p)}
                  onPrompt={(prompt) => { setInput(prompt); }}
                  shareUrl={shareUrl}
                  isPublic={isPublic}
                />
              )}
              {panel === "deploy" && (
                <DeployPanel
                  githubUrl={project?.github_url ?? null}
                  vercelUrl={project?.vercel_url ?? null}
                  defaultRepoName={`${(data?.project.name ?? "site").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}-${slug}`}
                  onPushGithub={(repoName, isPrivate) => ghMut.mutate({ repoName, isPrivate })}
                  onDeployVercel={() => vercelMut.mutate()}
                  pushing={ghMut.isPending}
                  deploying={vercelMut.isPending}
                />
              )}
            </div>
          </aside>
        )}
      </div>
      </div>
    </div>
  );
}

function PromptMessage({ content, onReuse, disabled = false }: {
  content: string;
  onReuse: (content: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 420;
  const preview = `${content.slice(0, 280).trimEnd()}…`;

  return (
    <div className={isLong ? "rounded-xl border border-border/60 bg-surface/60 p-3" : ""}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {isLong && !expanded ? preview : content}
      </p>
      {isLong && (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-xs font-medium text-leaf hover:underline"
          >
            {expanded ? "Show less" : `Show full prompt · ${content.length.toLocaleString()} characters`}
          </button>
          <button
            type="button"
            onClick={() => onReuse(content)}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Copy className="size-3" /> Use again
          </button>
        </div>
      )}
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
        <span className="absolute -top-1 -right-1 text-[9px] font-mono bg-accent text-accent-foreground rounded-full size-4 flex items-center justify-center">
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
          <button key={k} onClick={() => setKind(k)} className={`flex-1 text-xs py-1.5 rounded capitalize ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{k}</button>
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
              <p className="text-[10px] uppercase tracking-wider text-leaf">{a.kind}</p>
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
        Skills are applied only when you invoke them with a slash command, such as <code>/design-system</code>. Pin the skills you use often to move them to the top of the command picker.
      </p>
      <Link to="/skills" className="block text-xs text-leaf hover:underline">Manage your skill library →</Link>
      <button onClick={() => setCreating(!creating)} className="w-full inline-flex items-center justify-center gap-2 text-xs py-2 rounded-lg border border-border hover:border-ember/60 transition">
        {creating ? <X className="size-3.5" /> : <Plus className="size-3.5" />} {creating ? "Cancel" : "New skill"}
      </button>
      {creating && (
        <div className="space-y-2 p-3 rounded-lg border border-ember/30 bg-surface/40">
          <input placeholder="Skill name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-surface-elevated border border-border rounded px-2 py-1.5 text-xs" />
          <input placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-surface-elevated border border-border rounded px-2 py-1.5 text-xs" />
          <textarea placeholder="Instructions (rules, patterns, standards the AI should follow)" rows={6} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="w-full bg-surface-elevated border border-border rounded px-2 py-1.5 text-xs resize-none" />
          <button
            onClick={() => { if (form.name && form.instructions.length >= 20) { onCreate(form); setForm({ name: "", description: "", instructions: "" }); setCreating(false); } else { toast.error("Name + 20+ char instructions required"); } }}
            className="w-full bg-primary text-primary-foreground text-xs py-1.5 rounded"
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
                    {s.is_global && <span className="text-[9px] uppercase tracking-wider text-leaf">Built-in</span>}
                  </p>
                  {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                </div>
                <button
                  onClick={() => onToggle(s.id, !isActive)}
                  className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded ${isActive ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {isActive ? <span className="inline-flex items-center gap-1"><Check className="size-3" /> Pinned</span> : "Pin"}
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
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-border hover:border-ember/60 hover:text-leaf transition disabled:opacity-50"
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
          <button onClick={copy} className="shrink-0 px-3 rounded-lg bg-primary text-primary-foreground text-xs inline-flex items-center gap-1">
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
      <a href={shareUrl} target="_blank" rel="noreferrer" className="block text-center text-xs text-leaf hover:underline">
        Open preview in new tab →
      </a>
    </div>
  );
}

function PagesPanel({ pages, currentPath, onSelect, onDelete, onPrompt, shareUrl, isPublic }: {
  pages: { id: string; path: string; title: string; updated_at: string }[];
  currentPath: string;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onPrompt: (prompt: string) => void;
  shareUrl: string;
  isPublic: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Each page lives at its own URL. Ask the AI to <em>add a Contact page</em> or <em>create an About page with the team</em> — the navbar updates automatically.
      </p>
      <div className="space-y-2">
        {pages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No pages yet. Send a prompt to generate one.</p>
        )}
        {pages.map((p) => (
          <div key={p.id} className={`p-3 rounded-lg border transition ${currentPath === p.path ? "border-ember/60 bg-ember/5" : "border-border/60 bg-surface/40"}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <button onClick={() => onSelect(p.path)} className="min-w-0 text-left flex-1">
                <p className="text-sm font-medium truncate">{p.title || (p.path === "/" ? "Home" : p.path)}</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">{p.path}</p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {isPublic && (
                  <a href={`${shareUrl}${p.path === "/" ? "" : p.path}`} target="_blank" rel="noreferrer" className="p-1 text-muted-foreground hover:text-foreground" title="Open">
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                {p.path !== "/" && (
                  <button onClick={() => onDelete(p.path)} className="p-1 text-muted-foreground hover:text-destructive" title="Delete page">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Updated {formatDistanceToNow(new Date(p.updated_at))} ago</p>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-border/40 space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Quick prompts</p>
        {[
          "Add a Contact page with a form and our address.",
          "Add an About page telling our origin story.",
          "Add a Pricing page with three tiers.",
          "Add a Blog index page with 3 sample articles.",
        ].map((q) => (
          <button key={q} onClick={() => onPrompt(q)} className="block w-full text-left text-xs px-2 py-1.5 rounded border border-border bg-surface/40 hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function DeployPanel({ githubUrl, vercelUrl, defaultRepoName, onPushGithub, onDeployVercel, pushing, deploying }: {
  githubUrl: string | null;
  vercelUrl: string | null;
  defaultRepoName: string;
  onPushGithub: (repoName: string, isPrivate: boolean) => void;
  onDeployVercel: () => void;
  pushing: boolean;
  deploying: boolean;
}) {
  const [repoName, setRepoName] = useState(defaultRepoName);
  const [isPrivate, setIsPrivate] = useState(true);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Connect a repository and production site once. New generations then push a commit to that repository and publish a fresh Vercel deployment automatically.
      </p>

      <div className="space-y-3 p-3 rounded-xl border border-border/60 bg-surface/40">
        <div className="flex items-center gap-2">
          <Github className="size-4" />
          <p className="text-sm font-medium">GitHub repository</p>
        </div>
        {githubUrl ? (
          <a href={githubUrl} target="_blank" rel="noreferrer" className="block text-xs text-leaf truncate hover:underline">{githubUrl}</a>
        ) : (
          <p className="text-xs text-muted-foreground">No repo connected yet.</p>
        )}
        <input
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          placeholder="repo-name"
          className="w-full bg-surface-elevated border border-border rounded px-2 py-1.5 text-xs font-mono"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-ember" />
          Private repository
        </label>
        <button
          onClick={() => onPushGithub(repoName, isPrivate)}
          disabled={pushing || !repoName}
          className="w-full inline-flex items-center justify-center gap-2 text-xs py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          {pushing ? <Loader2 className="size-3.5 animate-spin" /> : <Github className="size-3.5" />}
          {githubUrl ? "Push update" : "Create repo & push"}
        </button>
      </div>

      <div className="space-y-3 p-3 rounded-xl border border-border/60 bg-surface/40">
        <div className="flex items-center gap-2">
          <Globe className="size-4" />
          <p className="text-sm font-medium">Vercel deployment</p>
        </div>
        {vercelUrl ? (
          <a href={vercelUrl} target="_blank" rel="noreferrer" className="block text-xs text-leaf truncate hover:underline">{vercelUrl}</a>
        ) : (
          <p className="text-xs text-muted-foreground">Not deployed yet.</p>
        )}
        <button
          onClick={onDeployVercel}
          disabled={deploying}
          className="w-full inline-flex items-center justify-center gap-2 text-xs py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          {deploying ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />}
          {vercelUrl ? "Redeploy to Vercel" : "Deploy to Vercel"}
        </button>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Each deploy is production. The URL above is the live, shareable site.
        </p>
      </div>
    </div>
  );
}
