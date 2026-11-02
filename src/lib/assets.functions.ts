import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const uploadAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      kind: z.enum(["logo", "reference", "image"]).default("reference"),
      name: z.string().min(1).max(200),
      contentType: z.string().min(1).max(100),
      dataBase64: z.string().min(1), // raw base64, no data: prefix
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase.from("projects").select("id").eq("id", data.projectId).eq("user_id", context.userId).maybeSingle();
    if (!project) throw new Error("Project not found");
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("File too large (max 8MB)");
    const safeName = data.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${context.userId}/${data.projectId}/${Date.now()}-${safeName}`;

    const { error: upErr } = await context.supabase.storage
      .from("project-assets")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    // 1-year signed URL (renewed when project loads)
    const { data: signed, error: sErr } = await context.supabase.storage
      .from("project-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (sErr || !signed) throw new Error(sErr?.message || "Signing failed");

    const { data: row, error: iErr } = await context.supabase.from("project_assets").insert({
      project_id: data.projectId,
      user_id: context.userId,
      kind: data.kind,
      name: data.name,
      url: signed.signedUrl,
      storage_path: path,
    }).select("*").single();
    if (iErr) throw new Error(iErr.message);
    return row;
  });

export const deleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: a } = await context.supabase
      .from("project_assets").select("storage_path").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (a?.storage_path) {
      await context.supabase.storage.from("project-assets").remove([a.storage_path]);
    }
    await context.supabase.from("project_assets").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
