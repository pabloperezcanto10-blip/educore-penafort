import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { RegisterForm } from "./register-form";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { platformSettings, schoolSettings } from "@/lib/settings";

export default async function RegisterPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect(getDashboardPathForRole(profile.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <UserPlus className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Crear cuenta</h1>
            <p className="text-sm text-muted-foreground">
              {platformSettings.name} · {schoolSettings.name}
            </p>
          </div>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}
