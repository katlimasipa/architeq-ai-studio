import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, prompt, updated_at, created_at")
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
    const { data: messages, error: mErr } = await context.supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("project_id", data.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { project, messages: messages ?? [] };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(100).default("Untitled") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({ name: data.name, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
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

const SYSTEM_PROMPT = `You are Architeq, an elite AI website architect. You generate complete, production-quality, single-file HTML documents.

REQUIREMENTS — every output MUST:
1. Be a COMPLETE valid HTML5 document starting with <!DOCTYPE html> and ending with </html>.
2. Include <script src="https://cdn.tailwindcss.com"></script> in <head> for styling.
3. Load Google Fonts via <link> tags. Pick distinctive fonts that match the brand — NEVER Inter/Roboto/Open Sans.
4. Use a sophisticated, intentional design system: cohesive color palette, strong typography hierarchy, generous spacing, premium feel.
5. Be fully responsive (mobile-first).
6. Use semantic HTML (header, main, section, footer, nav).
7. Include a <title> and meta description matching the project.
8. Use real, thoughtful copy — NEVER lorem ipsum, NEVER fake testimonials/stats/reviews/addresses. Use clearly-marked placeholders if business data is unknown.
9. Add subtle animations/transitions with Tailwind utilities.
10. Reference quality: Linear, Stripe, Vercel, Framer, Apple.

OUTPUT FORMAT:
Return ONLY the raw HTML. No markdown fences, no commentary, no explanation. Just the HTML document.

When iterating, return the FULL updated HTML document — never a diff or partial.`;

export const generateSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      message: z.string().min(1).max(4000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");

    // Verify ownership + load context
    const { data: project, error: pErr } = await context.supabase
      .from("projects")
      .select("id, html, name")
      .eq("id", data.projectId)
      .maybeSingle();
    if (pErr || !project) throw new Error("Project not found");

    const { data: history } = await context.supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Save user message
    await context.supabase.from("messages").insert({
      project_id: data.projectId,
      user_id: context.userId,
      role: "user",
      content: data.message,
    });

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const contextMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    if (project.html) {
      contextMessages.push({
        role: "assistant",
        content: project.html,
      });
    }

    contextMessages.push({ role: "user", content: data.message });

    let html: string;
    try {
      const result = await generateText({
        model,
        messages: contextMessages,
        maxOutputTokens: 16000,
      });
      html = result.text.trim();
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      if (err.statusCode === 429) throw new Error("Rate limit reached. Try again in a moment.");
      if (err.statusCode === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(err.message || "Generation failed");
    }

    // Strip markdown fences if model wrapped output
    html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
      throw new Error("Model returned invalid HTML. Try rephrasing your prompt.");
    }

    const assistantSummary = `Updated the site. ${html.length.toLocaleString()} characters generated.`;

    await context.supabase.from("messages").insert({
      project_id: data.projectId,
      user_id: context.userId,
      role: "assistant",
      content: assistantSummary,
    });

    await context.supabase
      .from("projects")
      .update({ html, prompt: data.message })
      .eq("id", data.projectId);

    return { html, summary: assistantSummary };
  });
