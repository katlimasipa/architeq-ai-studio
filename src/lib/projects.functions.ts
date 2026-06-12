import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function makeSlug() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, prompt, updated_at, created_at, slug, version, is_public")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: project, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found");

    const [messagesRes, assetsRes, versionsRes, skillsRes] = await Promise.all([
      context.supabase.from("messages").select("id, role, content, created_at").eq("project_id", data.id).order("created_at", { ascending: true }),
      context.supabase.from("project_assets").select("*").eq("project_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("project_versions").select("id, version, prompt, created_at").eq("project_id", data.id).order("version", { ascending: false }),
      context.supabase.from("project_skills").select("skill_id, skills(id, name, slug, description, instructions, is_global)").eq("project_id", data.id),
    ]);

    return {
      project,
      messages: messagesRes.data ?? [],
      assets: assetsRes.data ?? [],
      versions: versionsRes.data ?? [],
      activeSkills: (skillsRes.data ?? []).map((r: any) => r.skills).filter(Boolean),
    };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(100).default("Untitled") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({ name: data.name, user_id: context.userId, slug: makeSlug() })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Auto-activate Impeccable Design skill
    const { data: imp } = await context.supabase
      .from("skills")
      .select("id")
      .eq("slug", "impeccable-design")
      .is("user_id", null)
      .maybeSingle();
    if (imp) {
      await context.supabase
        .from("project_skills")
        .insert({ project_id: row.id, skill_id: imp.id, user_id: context.userId });
    }
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_public: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects").update({ is_public: data.is_public }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), versionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: v, error } = await context.supabase
      .from("project_versions").select("html, prompt").eq("id", data.versionId).maybeSingle();
    if (error || !v) throw new Error("Version not found");
    const { error: uErr } = await context.supabase
      .from("projects").update({ html: v.html, prompt: v.prompt }).eq("id", data.projectId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

const SYSTEM_PROMPT_BASE = `You are Architeq, an elite AI website architect. You generate complete, production-quality, single-file HTML documents.

ABSOLUTE REQUIREMENTS — every output MUST:
1. Be a COMPLETE valid HTML5 document starting with <!DOCTYPE html> and ending with </html>.
2. Include <script src="https://cdn.tailwindcss.com"></script> in <head>.
3. Load distinctive Google Fonts via <link>. NEVER Inter/Roboto/Open Sans/Poppins.
4. Use a sophisticated, intentional design system: cohesive palette, strong typography hierarchy, generous spacing, premium feel.
5. Fully responsive (mobile-first), semantic HTML, real considered copy (no lorem ipsum, no fake stats/testimonials).
6. Include matching <title> and meta description.
7. Subtle animations via Tailwind transitions.

CONTEXT PERSISTENCE — CRITICAL:
- The full conversation history, uploaded assets, design DNA, and current site HTML are all provided.
- TREAT THE PROJECT AS A LIVING APPLICATION. When the user asks for an edit ("make the buttons bigger", "add a section", "update the hero copy"), MODIFY ONLY the relevant parts of the existing HTML — preserve everything else byte-for-byte where possible.
- NEVER regenerate from scratch unless the user explicitly says "start over" or "rebuild".
- Respect the established Design DNA (fonts, colors, tone) across edits.
- Use uploaded logos/images directly via the URLs provided. NEVER substitute placeholder images for uploaded assets.

OUTPUT: Return ONLY the raw HTML. No markdown fences, no commentary. Always the FULL updated document.`;

function extractDesignDNA(html: string) {
  const fonts = Array.from(html.matchAll(/family=([^&"':]+)/g)).map((m) => decodeURIComponent(m[1].replace(/\+/g, " "))).slice(0, 6);
  const colors = Array.from(new Set(Array.from(html.matchAll(/#[0-9a-fA-F]{6}\b/g)).map((m) => m[0]))).slice(0, 12);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null;
  return { fonts, colors, title };
}

export const generateSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      message: z.string().min(1).max(8000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");

    const { data: project, error: pErr } = await context.supabase
      .from("projects")
      .select("id, html, name, version, design_dna")
      .eq("id", data.projectId)
      .maybeSingle();
    if (pErr || !project) throw new Error("Project not found");

    const [{ data: history }, { data: assets }, { data: skillRows }] = await Promise.all([
      context.supabase.from("messages").select("role, content").eq("project_id", data.projectId).order("created_at", { ascending: true }).limit(30),
      context.supabase.from("project_assets").select("kind, name, url").eq("project_id", data.projectId),
      context.supabase.from("project_skills").select("skills(name, instructions)").eq("project_id", data.projectId),
    ]);

    await context.supabase.from("messages").insert({
      project_id: data.projectId, user_id: context.userId, role: "user", content: data.message,
    });

    const skills = (skillRows ?? []).map((r: any) => r.skills).filter(Boolean) as { name: string; instructions: string }[];
    const skillBlock = skills.length
      ? `\n\nACTIVE SKILLS (stack — apply ALL simultaneously):\n${skills.map((s) => `--- SKILL: ${s.name} ---\n${s.instructions}`).join("\n\n")}`
      : "";

    const assetBlock = assets && assets.length
      ? `\n\nUPLOADED PROJECT ASSETS (use these URLs directly in the HTML — never placeholders):\n${assets.map((a) => `- ${a.kind.toUpperCase()} "${a.name}": ${a.url}`).join("\n")}`
      : "";

    const dnaBlock = project.design_dna && Object.keys(project.design_dna as object).length
      ? `\n\nESTABLISHED DESIGN DNA (preserve consistency):\n${JSON.stringify(project.design_dna, null, 2)}`
      : "";

    const system = SYSTEM_PROMPT_BASE + skillBlock + assetBlock + dnaBlock;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const contextMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: system },
      ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    if (project.html) {
      contextMessages.push({
        role: "assistant",
        content: `Current site HTML (preserve unless instructed to change):\n\n${project.html}`,
      });
    }
    contextMessages.push({ role: "user", content: data.message });

    let html: string;
    try {
      const result = await generateText({ model, messages: contextMessages, maxOutputTokens: 24000 });
      html = result.text.trim();
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      if (err.statusCode === 429) throw new Error("Rate limit reached. Try again in a moment.");
      if (err.statusCode === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(err.message || "Generation failed");
    }

    html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
      throw new Error("Model returned invalid HTML. Try rephrasing your prompt.");
    }

    const newVersion = (project.version ?? 0) + 1;
    const dna = extractDesignDNA(html);
    const summary = `v${newVersion} ready — ${html.length.toLocaleString()} chars. ${dna.fonts.length ? "Fonts: " + dna.fonts.slice(0, 3).join(", ") + ". " : ""}${dna.colors.length ? "Palette extracted." : ""}`;

    await Promise.all([
      context.supabase.from("messages").insert({
        project_id: data.projectId, user_id: context.userId, role: "assistant", content: summary,
      }),
      context.supabase.from("project_versions").insert({
        project_id: data.projectId, user_id: context.userId, version: newVersion, prompt: data.message, html,
      }),
      context.supabase.from("projects").update({
        html, prompt: data.message, version: newVersion, design_dna: dna as any,
      }).eq("id", data.projectId),
    ]);

    return { html, summary, version: newVersion };
  });

// Public preview — no auth
export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("projects")
      .select("id, name, html, is_public, updated_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error || !p) throw new Error("Not found");
    if (!p.is_public) throw new Error("This preview is private");
    return { name: p.name, html: p.html, updated_at: p.updated_at };
  });
