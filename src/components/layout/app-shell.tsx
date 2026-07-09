import Link from "next/link";
import {
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import type { Profile } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { platformSettings, schoolSettings } from "@/lib/settings";
import { SchoolLogo } from "@/components/branding/school-logo";
import { EduCoreAssistantButton } from "@/components/ai/educore-assistant-button";

type AppShellProps = {
  profile: Profile;
  academicYearName?: string | null;
  children: React.ReactNode;
};

export function AppShell({ profile, academicYearName, children }: AppShellProps) {
  const assistantEnabled = process.env.AI_ASSISTANT_ENABLED === "true";
  const showAssistant = assistantEnabled && (profile.role === "tutor" || profile.role === "director" || profile.role === "superadmin");
  const navigationItems = getNavigationItems(profile.role);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="border-b border-primary/25 bg-white shadow-sm">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href={getDashboardPathForRole(profile.role)} className="flex min-w-0 items-center gap-3">
            <SchoolLogo size="md" />
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold leading-tight text-foreground">
                {schoolSettings.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">Powered by {platformSettings.name}</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-3">
            {academicYearName ? (
              <span className="hidden rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground sm:inline-flex">
                Curso {academicYearName}
              </span>
            ) : null}
            <form action="/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
              >
                <LogOut className="h-4 w-4 text-primary" aria-hidden="true" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-[232px] shrink-0 border-r border-border bg-white lg:flex lg:flex-col">
          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegación principal">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3">
            <div className="rounded-lg border border-border bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">{platformSettings.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Navegación global del centro.</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
      {showAssistant ? <EduCoreAssistantButton userName={profile.full_name ?? profile.email} role={profile.role} /> : null}
    </div>
  );
}

function getNavigationItems(role: Profile["role"]) {
  if (role === "tutor") {
    return [
      { href: "/dashboard/tutor", label: "Panel", icon: ShieldCheck },
      { href: "/dashboard/tutor/subjects", label: "Mis materias", icon: GraduationCap },
      { href: "/dashboard/tutor/students", label: "Mis alumnos", icon: Users },
      { href: "/dashboard/tutor/evaluation-settings", label: "Criterios", icon: Settings },
      { href: "/dashboard/tutor/gradebook", label: "Cuaderno", icon: BookOpenCheck },
      { href: "/dashboard/tutor/communications", label: "Comunicaciones", icon: MessageSquare },
      { href: "/dashboard/tutor/schedule", label: "Horario", icon: CalendarDays }
    ];
  }

  if (role === "director") {
    return [
      { href: "/dashboard/director", label: "Panel", icon: ShieldCheck },
      { href: "/dashboard/director/students", label: "Alumnos", icon: Users },
      { href: "/dashboard/director/communications", label: "Comunicaciones", icon: MessageSquare },
      { href: "/dashboard/director/gradebook", label: "Cuaderno", icon: BookOpenCheck },
      { href: "/dashboard/director/calendar", label: "Calendario", icon: CalendarDays }
    ];
  }

  if (role === "superadmin") {
    return [
      { href: "/dashboard/admin", label: "Panel", icon: ShieldCheck },
      { href: "/dashboard/admin/maintenance", label: "Mantenimiento", icon: Settings },
      { href: "/dashboard/admin/gradebook", label: "Cuaderno", icon: BookOpenCheck },
      { href: "/dashboard/admin/communications", label: "Comunicaciones", icon: MessageSquare },
      { href: "/dashboard/admin/security", label: "Seguridad", icon: ShieldCheck }
    ];
  }

  return [
    { href: "/dashboard/family", label: "Panel", icon: ShieldCheck },
    { href: "/dashboard/family/communications", label: "Comunicaciones", icon: MessageSquare },
    { href: "/dashboard/family/grades", label: "Calificaciones", icon: BookOpenCheck },
    { href: "/dashboard/family/student", label: "Alumno", icon: Users },
    { href: "/dashboard/family/calendar", label: "Calendario", icon: CalendarDays }
  ];
}



