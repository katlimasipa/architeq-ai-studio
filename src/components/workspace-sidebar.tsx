import { Link } from "@tanstack/react-router";
import { Blocks, BookOpen, Cable, Layers, LogOut, Plus } from "lucide-react";

const links = [
  { to: "/dashboard" as const, label: "Projects", active: "projects" as const, icon: Layers },
  { to: "/templates" as const, label: "Templates", active: "templates" as const, icon: BookOpen },
  { to: "/skills" as const, label: "Skills", active: "skills" as const, icon: Blocks },
  { to: "/integrations" as const, label: "Connections", active: "integrations" as const, icon: Cable },
];

export type WorkspaceSection = (typeof links)[number]["active"];

export function WorkspaceSidebar({
  active,
  email,
  onNewProject,
  onSignOut,
}: {
  active: WorkspaceSection;
  email?: string;
  onNewProject?: () => void;
  onSignOut?: () => void;
}) {
  return (
    <aside className="rail flex w-14 shrink-0 flex-col items-center gap-3 py-4 md:w-[4.75rem] md:py-5">
      <Link
        to="/"
        className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-surface-elevated md:size-11"
        aria-label="Architeq home"
      >
        <img src="/favicon.png" alt="" className="size-9 rounded-xl object-cover md:size-10" />
      </Link>

      {onNewProject && (
        <button
          onClick={onNewProject}
          className="flex size-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition hover:brightness-95 md:size-11"
          title="New project"
          aria-label="New project"
        >
          <Plus className="size-5" />
        </button>
      )}

      <nav aria-label="Workspace" className="flex w-full flex-col items-center gap-2">
        {links.map(({ to, label, icon: Icon, active: linkActive }) => {
          const selected = linkActive === active;
          return (
            <Link
              key={to}
              to={to}
              aria-current={selected ? "page" : undefined}
              aria-label={label}
              title={label}
              className={`flex size-10 items-center justify-center rounded-2xl transition md:size-11 ${selected ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.7} />
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3">
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex size-10 items-center justify-center rounded-2xl text-white/65 transition hover:bg-white/10 hover:text-white md:size-11"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-[18px]" strokeWidth={1.7} />
          </button>
        )}
        {email && (
          <span
            className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-medium text-white"
            title={email}
            aria-label={`Signed in as ${email}`}
          >
            {email.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </aside>
  );
}

export function WorkspaceTabs({ active }: { active: WorkspaceSection }) {
  return (
    <nav aria-label="Workspace sections" className="flex flex-wrap gap-2">
      {links.map(({ to, label, active: linkActive }) => {
        const selected = linkActive === active;
        return (
          <Link
            key={to}
            to={to}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm transition ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-elevated text-muted-foreground hover:border-foreground/25 hover:text-foreground"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
