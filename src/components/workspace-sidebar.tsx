import { Link } from "@tanstack/react-router";
import { Blocks, BookOpen, Cable, Layers, LogOut, Plus } from "lucide-react";

const links = [
  { to: "/dashboard" as const, label: "Projects", active: "projects" as const, icon: Layers },
  { to: "/templates" as const, label: "Templates", active: "templates" as const, icon: BookOpen },
  { to: "/skills" as const, label: "Skills", active: "skills" as const, icon: Blocks },
  {
    to: "/integrations" as const,
    label: "Connections",
    active: "integrations" as const,
    icon: Cable,
  },
];

export function WorkspaceSidebar({
  active,
  email,
  onNewProject,
  onSignOut,
}: {
  active: "projects" | "templates" | "skills" | "integrations";
  email?: string;
  onNewProject?: () => void;
  onSignOut?: () => void;
}) {
  return (
    <aside className="rail flex w-14 shrink-0 flex-col items-center gap-2 py-4 md:w-52 md:items-stretch md:px-3">
      <Link
        to="/"
        className="mx-auto mb-3 flex size-9 items-center justify-center rounded-xl bg-surface-elevated md:mx-1"
        aria-label="Architeq home"
      >
        <img src="/favicon.png" alt="" className="size-8 rounded-lg object-cover" />
      </Link>
      {onNewProject && (
        <button
          onClick={onNewProject}
          className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition hover:brightness-95 md:mx-0 md:w-full md:justify-start md:gap-2 md:px-3"
          title="New project"
        >
          <Plus className="size-4" />
          <span className="hidden text-sm font-medium md:inline">New project</span>
        </button>
      )}
      <nav
        aria-label="Workspace"
        className="flex w-full flex-col items-center gap-1 md:items-stretch"
      >
        {links.map(({ to, label, icon: Icon, active: linkActive }) => {
          const selected = linkActive === active;
          return (
            <Link
              key={to}
              to={to}
              aria-current={selected ? "page" : undefined}
              title={label}
              className={`flex size-10 items-center justify-center rounded-xl transition md:w-full md:justify-start md:gap-3 md:px-3 ${selected ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"}`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden text-sm md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex w-full flex-col items-center gap-2 md:items-stretch">
        {email && (
          <p className="hidden truncate px-2 text-[11px] text-white/45 md:block" title={email}>
            {email}
          </p>
        )}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex size-10 items-center justify-center rounded-xl text-white/65 transition hover:bg-white/8 hover:text-white md:w-full md:justify-start md:gap-3 md:px-3"
            title="Sign out"
          >
            <LogOut className="size-4" />
            <span className="hidden text-sm md:inline">Sign out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
