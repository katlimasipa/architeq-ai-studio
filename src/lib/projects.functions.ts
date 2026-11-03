import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEmptyGenerationMessage, getProviderErrorMessage, isTemporaryProviderError } from "@/lib/ai-generation-errors";
import { z } from "zod";

function makeSlug() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, prompt, updated_at, created_at, slug, version, is_public, github_url, vercel_url")
      .eq("user_id", context.userId)
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
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found");

    const [messagesRes, assetsRes, versionsRes, skillsRes, pagesRes] = await Promise.all([
      context.supabase.from("messages").select("id, role, content, created_at").eq("project_id", data.id).eq("user_id", context.userId).order("created_at", { ascending: true }),
      context.supabase.from("project_assets").select("*").eq("project_id", data.id).eq("user_id", context.userId).order("created_at", { ascending: false }),
      context.supabase.from("project_versions").select("id, version, prompt, created_at").eq("project_id", data.id).eq("user_id", context.userId).order("version", { ascending: false }),
      context.supabase.from("project_skills").select("skill_id, skills(id, name, slug, description, instructions, is_global)").eq("project_id", data.id).eq("user_id", context.userId),
      (context.supabase as any).from("project_pages").select("id, path, title, updated_at").eq("project_id", data.id).eq("user_id", context.userId).order("path", { ascending: true }),
    ]);

    return {
      project,
      messages: messagesRes.data ?? [],
      assets: assetsRes.data ?? [],
      versions: versionsRes.data ?? [],
      activeSkills: (skillsRes.data ?? []).map((r: any) => r.skills).filter(Boolean),
      pages: (pagesRes.data ?? []) as { id: string; path: string; title: string; updated_at: string }[],
    };
  });

export const getProjectPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("project_pages")
      .select("html, title, path")
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .eq("path", data.path)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as { html: string; title: string; path: string } | null;
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(1).max(100).default("Untitled project"),
      prompt: z.string().max(8000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({
        name: data.name,
        prompt: data.prompt?.trim() ?? "",
        user_id: context.userId,
        slug: makeSlug(),
        is_public: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_public: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ is_public: data.is_public })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), versionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: v, error } = await context.supabase
      .from("project_versions")
      .select("html, prompt")
      .eq("id", data.versionId)
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !v) throw new Error("Version not found");
    const { error: uErr } = await context.supabase
      .from("projects")
      .update({ html: v.html, prompt: v.prompt })
      .eq("id", data.projectId)
      .eq("user_id", context.userId);
    if (uErr) throw new Error(uErr.message);
    // Re-parse pages from the version HTML
    const pages = parsePages(v.html);
    await syncPages(context.supabase, data.projectId, context.userId, pages);
    return { ok: true };
  });

const SYSTEM_PROMPT_BASE = `You are Architeq, an elite AI website architect. You generate complete, production-quality websites — single page or multi-page — as raw HTML documents.

ABSOLUTE REQUIREMENTS — every page MUST:
1. Be a COMPLETE valid HTML5 document starting with <!DOCTYPE html> and ending with </html>.
2. Include <script src="https://cdn.tailwindcss.com"></script> in <head>.
3. Load distinctive Google Fonts via <link>. NEVER Inter / Roboto / Open Sans / Poppins / system defaults.
4. Use a sophisticated, intentional design system: cohesive OKLCH palette, strong typography hierarchy, generous spacing, premium feel.
5. Fully responsive (mobile-first), semantic HTML, real considered copy.
6. Include matching <title> and meta description.
7. Subtle motion via Tailwind transitions.

MULTI-PAGE FORMAT — MANDATORY when the site has more than one page:
Output EACH page as its own block using this exact delimiter on its own line:

===PAGE: <path> | <Page Title>===
<!DOCTYPE html>
... full standalone HTML document ...

===PAGE: <path> | <Page Title>===
<!DOCTYPE html>
... next page ...

Rules:
- The first page is always "===PAGE: / | Home===".
- Path is absolute, lowercase, kebab-case: "/", "/about", "/services", "/contact", "/work/case-study-name".
- Every page MUST include the SAME header/navbar markup and the SAME footer markup, so navigation is consistent.
- Navbar links MUST be real <a href="/about"> style ABSOLUTE PATHS that match other page paths exactly. NEVER use "#section" for cross-page nav.
- Every interactive button needs either a real href OR a clear onclick (e.g. open a mailto, scroll to a section, navigate to another page). NO dead buttons.
- Forms use POST to "mailto:contact@example.com" or similar — never broken.
- Share the same fonts, palette, components across every page so the site feels unified.

SINGLE-PAGE SITES:
- If the brief is genuinely a one-page landing, output one HTML document with no PAGE delimiter.

CONTEXT PERSISTENCE — CRITICAL:
- The full conversation history, uploaded assets, design DNA, and current pages are provided below.
- Treat the project as a LIVING site. For edits, MODIFY ONLY the relevant page(s) — re-output only the page blocks you changed. Pages you do not output are preserved.
- When adding a new page, ALSO re-output the navbar update in every existing page (re-emit those pages) so the new page is linked everywhere.
- NEVER regenerate from scratch unless the user says "start over" or "rebuild".
- Respect the established Design DNA across edits.
- Use uploaded asset URLs directly in <img>. NEVER replace them with placeholders.

OUTPUT: Return ONLY the raw page block(s). No markdown fences, no commentary, no JSON. Start either with "===PAGE: " or "<!DOCTYPE html>".`;

function extractDesignDNA(html: string) {
  const fonts = Array.from(html.matchAll(/family=([^&"':]+)/g)).map((m) => decodeURIComponent(m[1].replace(/\+/g, " "))).slice(0, 6);
  const colors = Array.from(new Set(Array.from(html.matchAll(/#[0-9a-fA-F]{6}\b/g)).map((m) => m[0]))).slice(0, 12);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null;
  return { fonts, colors, title };
}

export function parsePages(text: string): { path: string; title: string; html: string }[] {
  const re = /^===PAGE:\s*(\S+?)\s*(?:\|\s*([^=\n]+?))?\s*===\s*$/gm;
  const matches: { headerStart: number; bodyStart: number; path: string; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({
      headerStart: m.index,
      bodyStart: m.index + m[0].length,
      path: m[1].trim(),
      title: (m[2] ?? "").trim(),
    });
  }
  if (matches.length === 0) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return [{ path: "/", title: "", html: trimmed }];
  }
  return matches.map((mm, i) => {
    const next = matches[i + 1]?.headerStart ?? text.length;
    return { path: mm.path, title: mm.title, html: text.slice(mm.bodyStart, next).trim() };
  });
}

async function syncPages(
  supabase: any,
  projectId: string,
  userId: string,
  pages: { path: string; title: string; html: string }[],
) {
  if (!pages.length) return;
  // Upsert each page (don't delete missing — edits only update mentioned pages)
  for (const p of pages) {
    const { data: existing } = await supabase
      .from("project_pages").select("id, version, title").eq("project_id", projectId).eq("user_id", userId).eq("path", p.path).maybeSingle();
    if (existing) {
      await supabase.from("project_pages").update({
        title: p.title || existing.title || "",
        html: p.html,
        version: (existing.version ?? 1) + 1,
      }).eq("id", existing.id).eq("user_id", userId);
    } else {
      await supabase.from("project_pages").insert({
        project_id: projectId, user_id: userId, path: p.path, title: p.title || "", html: p.html,
      });
    }
  }
}

export const deletePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.path === "/") throw new Error("Cannot delete the home page");
    const { error } = await (context.supabase as any)
      .from("project_pages")
      .delete()
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .eq("path", data.path);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type GenerateSiteProgress = {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  detail: string;
};

export type GenerateSiteResult = {
  html: string;
  summary: string;
  version: number;
  pages: { path: string; title: string }[];
};

export type GenerateSiteEvent =
  | { type: "progress"; progress: GenerateSiteProgress }
  | { type: "complete"; result: GenerateSiteResult }
  | { type: "error"; message: string };

async function generateSiteWithProgress(
  data: { projectId: string; message: string },
  context: { supabase: any; userId: string },
  requestOidcToken: string | null | undefined,
  report: (progress: GenerateSiteProgress) => void,
): Promise<GenerateSiteResult> {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const vercelGatewayToken =
    process.env.AI_GATEWAY_API_KEY || requestOidcToken || process.env.VERCEL_OIDC_TOKEN;
  if (!lovableApiKey && !geminiApiKey && !vercelGatewayToken) {
    throw new Error(
      "AI generation needs a provider key. Add GEMINI_API_KEY from Google AI Studio, add AI_GATEWAY_API_KEY or LOVABLE_API_KEY, or enable Secure Backend Access (OIDC) on Vercel.",
    );
  }

  report({ step: 1, title: "Loading your project", detail: "Gathering saved pages, skills, assets, and recent changes." });
  const { data: project, error: pErr } = await context.supabase
    .from("projects")
    .select("id, html, name, version, design_dna")
    .eq("id", data.projectId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (pErr || !project) throw new Error("Project not found");

  const [{ data: history }, { data: assets }, { data: skillRows }, { data: existingPages }] = await Promise.all([
    context.supabase.from("messages").select("role, content").eq("project_id", data.projectId).eq("user_id", context.userId).order("created_at", { ascending: true }).limit(30),
    context.supabase.from("project_assets").select("kind, name, url").eq("project_id", data.projectId).eq("user_id", context.userId),
    context.supabase.from("skills").select("slug, name, instructions, user_id"),
    (context.supabase as any).from("project_pages").select("path, title, html").eq("project_id", data.projectId).eq("user_id", context.userId).order("path", { ascending: true }),
  ]);
  const messageHistory = (history ?? []) as { role: string; content: string }[];
  const projectAssets = (assets ?? []) as { kind: string; name: string; url: string }[];

  await context.supabase.from("messages").insert({
    project_id: data.projectId, user_id: context.userId, role: "user", content: data.message,
  });

  const invokedSkillSlugs = Array.from(
    new Set(Array.from(data.message.matchAll(/(?:^|\s)\/{1,2}([a-z0-9]+(?:-[a-z0-9]+)*)(?=$|\s|[.,!?])/gi), (m) => m[1].toLowerCase())),
  );
  const availableSkills = (skillRows ?? []) as { slug: string; name: string; instructions: string; user_id: string | null }[];
  const invokedSkills: typeof availableSkills = [];
  for (const command of invokedSkillSlugs) {
    const exactMatches = availableSkills.filter((skill) => skill.slug === command);
    const prefixMatches = availableSkills.filter((skill) => skill.slug.startsWith(`${command}-`));
    const match = exactMatches.find((skill) => skill.user_id === context.userId)
      ?? exactMatches[0]
      ?? (prefixMatches.length === 1 ? prefixMatches[0] : undefined);
    if (match && !invokedSkills.some((skill) => skill.slug === match.slug)) invokedSkills.push(match);
  }
  const skillBlock = invokedSkills.length
    ? `\n\nINVOKED SKILLS (apply only the skills explicitly called with /commands):\n${invokedSkills.map((s) => `--- SKILL: ${s.name} (/${s.slug}) ---\n${s.instructions}`).join("\n\n")}`
    : "";

  const assetBlock = projectAssets.length
    ? `\n\nUPLOADED PROJECT ASSETS (use these URLs directly in HTML — never placeholders):\n${projectAssets.map((a) => `- ${a.kind.toUpperCase()} "${a.name}": ${a.url}`).join("\n")}`
    : "";

  const dnaBlock = project.design_dna && Object.keys(project.design_dna as object).length
    ? `\n\nESTABLISHED DESIGN DNA (preserve consistency):\n${JSON.stringify(project.design_dna, null, 2)}`
    : "";

  const pages = (existingPages ?? []) as { path: string; title: string; html: string }[];
  const pagesBlock = pages.length
    ? `\n\nCURRENT PAGES (paths in this project — preserve unless instructed to change):\n${pages.map((p) => `- ${p.path}  "${p.title}"  (${p.html.length} chars)`).join("\n")}`
    : "";

  const system = SYSTEM_PROMPT_BASE + skillBlock + assetBlock + dnaBlock + pagesBlock;

  const {
    createGeminiAiProvider,
    createLovableAiGatewayProvider,
    createVercelAiGatewayProvider,
  } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const geminiModels = [
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  ];
  const modelCandidates = lovableApiKey
    ? [{ label: "Gemini 3 Flash Preview", model: createLovableAiGatewayProvider(lovableApiKey)("google/gemini-3-flash-preview") }]
    : geminiApiKey
      ? geminiModels.map(({ id, label }) => ({ label, model: createGeminiAiProvider(geminiApiKey)(id) }))
      : geminiModels.map(({ id, label }) => ({ label, model: createVercelAiGatewayProvider(vercelGatewayToken!)(`google/${id}`) }));

  const contextMessages: { role: "user" | "assistant"; content: string }[] = [
    ...messageHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  if (pages.length > 0) {
    const dump = pages.map((p) => `===PAGE: ${p.path} | ${p.title}===\n${p.html}`).join("\n\n");
    contextMessages.push({ role: "assistant", content: `Current site pages (preserve unless instructed):\n\n${dump}` });
  } else if (project.html) {
    contextMessages.push({ role: "assistant", content: `Current site HTML:\n\n${project.html}` });
  }
  contextMessages.push({ role: "user", content: data.message });

  report({ step: 2, title: "Generating your site", detail: "Waiting for the AI to start writing the pages." });
  let raw = "";
  let generationSeconds = 0;
  const progressInterval = setInterval(() => {
    generationSeconds += 10;
    report({
      step: 2,
      title: "Generating your site",
      detail: `The AI is still drafting your pages (${generationSeconds}s elapsed).`,
    });
  }, 10_000);
  try {
    for (let index = 0; index < modelCandidates.length; index += 1) {
      const candidate = modelCandidates[index];
      try {
        const result = await generateText({
          model: candidate.model,
          system,
          messages: contextMessages,
          maxOutputTokens: 32000,
          maxRetries: 0,
        });
        raw = result.text.trim();
        if (!raw) throw new Error(getEmptyGenerationMessage(result.finishReason, result.rawFinishReason));
        break;
      } catch (e) {
        const nextCandidate = modelCandidates[index + 1];
        if (!nextCandidate || !isTemporaryProviderError(e)) throw e;
        report({
          step: 2,
          title: "Switching to a backup model",
          detail: `${candidate.label} is temporarily busy. Trying ${nextCandidate.label}.`,
        });
      }
    }
  } catch (e) {
    const usesVercelGateway = !lovableApiKey && !geminiApiKey;
    throw new Error(getProviderErrorMessage(e, usesVercelGateway));
  } finally {
    clearInterval(progressInterval);
  }

  report({ step: 3, title: "Checking the generated pages", detail: "Validating HTML and matching page routes." });
  raw = raw.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = parsePages(raw);
  if (!parsed.length) throw new Error("Model returned empty output. Try rephrasing.");
  for (const p of parsed) {
    if (!p.html.toLowerCase().includes("<html") && !p.html.toLowerCase().includes("<!doctype")) {
      throw new Error(`Page "${p.path}" missing valid HTML. Try again.`);
    }
  }

  report({ step: 4, title: "Saving your preview", detail: `Saving ${parsed.length} page${parsed.length === 1 ? "" : "s"} and a version snapshot.` });
  await syncPages(context.supabase, data.projectId, context.userId, parsed);

  const indexHtml = parsed.find((p) => p.path === "/")?.html ?? parsed[0].html;
  const newVersion = (project.version ?? 0) + 1;
  const dna = extractDesignDNA(indexHtml);
  const pageList = parsed.map((p) => p.path).join(", ");
  const summary = `v${newVersion} — updated ${parsed.length} page${parsed.length > 1 ? "s" : ""}: ${pageList}. ${dna.fonts.length ? "Fonts: " + dna.fonts.slice(0, 3).join(", ") + "." : ""}`;

  await Promise.all([
    context.supabase.from("messages").insert({
      project_id: data.projectId, user_id: context.userId, role: "assistant", content: summary,
    }),
    context.supabase.from("project_versions").insert({
      project_id: data.projectId, user_id: context.userId, version: newVersion, prompt: data.message, html: raw,
    }),
    context.supabase.from("projects").update({
      html: indexHtml, prompt: data.message, version: newVersion, design_dna: dna as any,
    }).eq("id", data.projectId).eq("user_id", context.userId),
  ]);

  return { html: indexHtml, summary, version: newVersion, pages: parsed.map((p) => ({ path: p.path, title: p.title })) };
}

export const generateSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      message: z.string().min(1).max(16000),
      attachments: z.array(z.object({
        name: z.string().min(1).max(200),
        kind: z.enum(["reference", "image"]),
        dataUrl: z.string().startsWith("data:image/"),
      })).max(6).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const requestOidcToken = getRequest()?.headers.get("x-vercel-oidc-token");
    return new ReadableStream<GenerateSiteEvent>({
      start(controller) {
        const emit = (event: GenerateSiteEvent) => {
          try {
            controller.enqueue(event);
          } catch {
            // The browser may leave the page while generation continues.
          }
        };

        void generateSiteWithProgress(data, context, requestOidcToken, (progress) => {
          emit({ type: "progress", progress });
        }).then(
          (result) => emit({ type: "complete", result }),
          (error: unknown) => emit({
            type: "error",
            message: error instanceof Error ? error.message : "Generation failed. Try again.",
          }),
        ).finally(() => {
          try {
            controller.close();
          } catch {
            // The stream can already be cancelled if the browser leaves.
          }
        });
      },
    });
  });

// Public preview — no auth — returns one page by path
export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(64), path: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { getPublicProjectPage } = await import("@/lib/public-preview.server");
    const page = await getPublicProjectPage(data.slug, data.path ?? "/");
    if (!page) throw new Error("Preview not found or is private");
    return page;
  });
