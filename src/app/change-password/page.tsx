import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    redirect("/login");
  }

  const dashboardHref = getDashboardPathForRole(profile.role);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Cambiar contrasena</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Por seguridad, debes cambiar tu contrasena antes de continuar.
            </p>
          </div>
        </div>

        <ChangePasswordForm
          canReturn={!profile.must_change_password}
          dashboardHref={dashboardHref}
        />
      </section>
    </main>
  );
}
