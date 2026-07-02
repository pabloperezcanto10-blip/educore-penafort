import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { platformSettings, schoolSettings } from "@/lib/settings";

export default async function HomePage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect(getDashboardPathForRole(profile.role));
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Plataforma escolar profesional
            </div>
            <div className="mt-8 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-8 w-8" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">Logo principal</p>
                <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
                  {platformSettings.name}
                </h1>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              {platformSettings.tagline}
            </p>
          </div>

          <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{schoolSettings.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{schoolSettings.accessLabel}</p>
              </div>
            </div>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Iniciar sesi\u00f3n
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}
