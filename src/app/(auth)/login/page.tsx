import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { platformSettings, schoolSettings } from "@/lib/settings";
import { SchoolLogo } from "@/components/branding/school-logo";

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    if (profile.must_change_password) {
      redirect("/change-password");
    }

    redirect(getDashboardPathForRole(profile.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <SchoolLogo size="lg" />
          <h1 className="mt-5 text-2xl font-semibold tracking-normal text-foreground">{schoolSettings.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acceso a la comunidad educativa</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">
            Powered by {platformSettings.name}
          </p>
        </div>
        <div className="text-left">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
