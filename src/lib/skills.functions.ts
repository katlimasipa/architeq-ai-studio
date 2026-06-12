import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listSkills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("skills")
      .select("*")
      .order("is_global", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(1).max(80),
      description: z.string().max(280).default(""),
      instructions: z.string().min(20).max(20000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: row, error } = await context.supabase.from("skills").insert({
      user_id: context.userId,
      name: data.name,
      slug,
      description: data.description,
      instructions: data.instructions,
      is_global: false,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("skills").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleProjectSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ projectId: z.string().uuid(), skillId: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.active) {
      const { error } = await context.supabase.from("project_skills").insert({
        project_id: data.projectId, skill_id: data.skillId, user_id: context.userId,
      });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      await context.supabase.from("project_skills")
        .delete().eq("project_id", data.projectId).eq("skill_id", data.skillId);
    }
    return { ok: true };
  });
