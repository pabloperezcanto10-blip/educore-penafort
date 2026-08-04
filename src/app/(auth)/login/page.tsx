import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "./login-form";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getAuthenticatedEntryPath } from "@/lib/schools/context";
import { platformSettings } from "@/lib/settings";
import { SchoolLogo } from "@/components/branding/school-logo";
import {
  PUBLIC_SCHOOL_SELECTOR_PATH,
  getPublicSchoolBySlug
} from "@/lib/schools/public-schools";

type LoginPageProps = {
  searchParams?: { school?: string };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const profile = await getCurrentUserProfile();

  if (profile) {
    if (profile.must_change_password) {
      redirect("/change-password");
    }

    redirect(await getAuthenticatedEntryPath(profile));
  }

  const selectedSchool = getPublicSchoolBySlug(searchParams?.school);
  if (!selectedSchool) {
    redirect(
      searchParams?.school
        ? `${PUBLIC_SCHOOL_SELECTOR_PATH}?error=invalid`
        : PUBLIC_SCHOOL_SELECTOR_PATH
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{ backgroundColor: selectedSchool.brand.colors.background }}
    >
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex flex-col items-center">
          <SchoolLogo
            size="lg"
            src={selectedSchool.brand.assets.icon}
            name={selectedSchool.name}
            initials={selectedSchool.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-normal text-foreground">
            {selectedSchool.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Acceso a la comunidad educativa</p>
          <p
            className="mt-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: selectedSchool.brand.colors.primary }}
          >
            Powered by {platformSettings.name}
          </p>
        </div>
        <div className="text-left">
          <LoginForm
            schoolSlug={selectedSchool.slug}
            schoolName={selectedSchool.name}
            primaryColor={selectedSchool.brand.colors.primary}
          />
        </div>
        <Link
          href={PUBLIC_SCHOOL_SELECTOR_PATH}
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Cambiar de centro
        </Link>
      </section>
    </main>
  );
}
