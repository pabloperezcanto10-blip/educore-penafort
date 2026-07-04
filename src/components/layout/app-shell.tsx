import Link from "next/link";
import { LogOut } from "lucide-react";
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

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      {showAssistant ? <EduCoreAssistantButton userName={profile.full_name ?? profile.email} role={profile.role} /> : null}
    </div>
  );
}
