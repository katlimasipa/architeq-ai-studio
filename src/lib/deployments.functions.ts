import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function slugifyRepo(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "architeq-site";
}

function pathToFile(path: string): string {
  // "/" -> "index.html", "/about" -> "about/index.html"
  if (path === "/" || path === "") return "index.html";
  const clean = path.replace(/^\/+|\/+$/g, "");
  return `${clean}/index.html`;
}

async function loadProjectFiles(supabase: any, projectId: string, userId: string) {
  const { data: project, error } = await supabase
    .from("projects").select("id, name, html, slug, github_repo, vercel_project_id").eq("id", projectId).eq("user_id", userId).maybeSingle();
  if (error || !project) throw new Error("Project not found");

  const { data: pages } = await supabase
    .from("project_pages").select("path, html").eq("project_id", projectId).eq("user_id", userId);

  const files: Record<string, string> = {};
  if (pages && pages.length) {
    for (const p of pages as { path: string; html: string }[]) {
      files[pathToFile(p.path)] = p.html;
    }
  }
  // Fallback / ensure index
  if (!files["index.html"]) files["index.html"] = project.html || "<!DOCTYPE html><html><body><p>Empty</p></body></html>";

  // Add minimal README + vercel.json for clean static hosting
  files["README.md"] = `# ${project.name}\n\nBuilt with Architeq AI Studio.\n`;
  files["vercel.json"] = JSON.stringify({ cleanUrls: true, trailingSlash: false }, null, 2);

  return { project, files };
}

// ============ GITHUB ============

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Architeq-AI-Studio",
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export const pushToGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      repoName: z.string().optional(),
      isPrivate: z.boolean().optional().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN is not configured");

    const { project, files } = await loadProjectFiles(context.supabase, data.projectId, context.userId);
    const user = await gh(token, "/user");
    const owner = user.login as string;

    const desiredName = slugifyRepo(project.github_repo?.split("/").at(-1) || data.repoName || `${project.name}-${project.slug}`);
    let repoFullName = project.github_repo || `${owner}/${desiredName}`;
    if (repoFullName.split("/")[0]?.toLowerCase() !== owner.toLowerCase()) {
      throw new Error("The connected GitHub repository belongs to a different GitHub account. Reconnect it with the matching account.");
    }

    // Check if repo exists already (re-deploy case)
    const existing = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "Architeq-AI-Studio" },
    });

    let repoUrl: string;
    if (existing.status === 404) {
      const created = await gh(token, "/user/repos", {
        method: "POST",
        body: JSON.stringify({
          name: desiredName,
          description: `${project.name} — built with Architeq AI Studio`,
          private: data.isPrivate,
          auto_init: true,
        }),
      });
      repoFullName = created.full_name;
      repoUrl = created.html_url;
      // Tiny wait for repo init
      await new Promise((r) => setTimeout(r, 1500));
    } else if (existing.ok) {
      const j = await existing.json();
      repoUrl = j.html_url;
    } else {
      throw new Error(`GitHub repo check failed: ${existing.status}`);
    }

    // Get default branch
    const repoInfo = await gh(token, `/repos/${repoFullName}`);
    const branch = repoInfo.default_branch as string;

    // Get current ref
    const ref = await gh(token, `/repos/${repoFullName}/git/ref/heads/${branch}`);
    const baseSha = ref.object.sha as string;
    const baseCommit = await gh(token, `/repos/${repoFullName}/git/commits/${baseSha}`);
    const baseTreeSha = baseCommit.tree.sha as string;

    // Create blobs
    const tree: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];
    for (const [filePath, content] of Object.entries(files)) {
      const blob = await gh(token, `/repos/${repoFullName}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content, encoding: "utf-8" }),
      });
      tree.push({ path: filePath, mode: "100644", type: "blob", sha: blob.sha });
    }

    const remoteTree = await gh(token, `/repos/${repoFullName}/git/trees/${baseTreeSha}?recursive=1`);
    const currentFiles = new Set(Object.keys(files));
    for (const entry of remoteTree.tree as { path: string; type: string }[]) {
      if (entry.type === "blob" && entry.path.toLowerCase().endsWith(".html") && !currentFiles.has(entry.path)) {
        tree.push({ path: entry.path, mode: "100644", type: "blob", sha: null });
      }
    }

    const newTree = await gh(token, `/repos/${repoFullName}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    });

    const commit = await gh(token, `/repos/${repoFullName}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: `Architeq deploy — ${new Date().toISOString()}`,
        tree: newTree.sha,
        parents: [baseSha],
      }),
    });

    await gh(token, `/repos/${repoFullName}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha }),
    });

    await context.supabase.from("projects").update({
      github_repo: repoFullName,
      github_url: repoUrl,
      last_deployed_at: new Date().toISOString(),
    } as any).eq("id", data.projectId).eq("user_id", context.userId);

    return { repoFullName, repoUrl };
  });

// ============ VERCEL ============

async function vercel(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

export const deployToVercel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const token = process.env.VERCEL_TOKEN;
    if (!token) throw new Error("VERCEL_TOKEN is not configured");

    const { project, files } = await loadProjectFiles(context.supabase, data.projectId, context.userId);
    const projectName = slugifyRepo(`${project.name}-${project.slug}`);

    // Build inline files array — Vercel v13 supports `data` (base64) or `file` + content
    const filesPayload = Object.entries(files).map(([file, content]) => ({
      file,
      data: Buffer.from(content, "utf-8").toString("base64"),
      encoding: "base64",
    }));

    const deployment = await vercel(token, "/v13/deployments?forceNew=1", {
      method: "POST",
      body: JSON.stringify({
        name: projectName,
        ...(project.vercel_project_id ? { project: project.vercel_project_id } : {}),
        files: filesPayload,
        target: "production",
        projectSettings: {
          framework: null,
          buildCommand: null,
          installCommand: null,
          outputDirectory: null,
        },
      }),
    });

    const deployUrl = `https://${deployment.url}`;
    const aliasUrl = deployment.alias && deployment.alias[0] ? `https://${deployment.alias[0]}` : `https://${projectName}.vercel.app`;

    await context.supabase.from("projects").update({
      vercel_project_id: deployment.projectId ?? projectName,
      vercel_url: aliasUrl,
      last_deployed_at: new Date().toISOString(),
    } as any).eq("id", data.projectId).eq("user_id", context.userId);

    return { url: aliasUrl, deploymentId: deployment.id, inspectorUrl: deployment.inspectorUrl ?? null };
  });
