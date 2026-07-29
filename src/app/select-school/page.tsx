import { Building2, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { selectActiveSchool } from "@/app/school-context/actions";
import { SchoolLogo } from "@/components/branding/school-logo";
import { getDashboardPathForRole, getRoleLabel } from "@/lib/auth/roles";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  getUserSchoolMemberships,
  resolveActiveSchoolContext,
  SchoolContextError
} from "@/lib/schools/context";

type SelectSchoolPageProps = {
  searchParams?: { error?: string };
};

export default async function SelectSchoolPage({
  searchParams
}: SelectSchoolPageProps) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login");
  }
  if (profile.must_change_password) {
    redirect("/change-password");
  }

  const { memberships, schemaAvailable } = await getUserSchoolMemberships(profile.id);
  if (!schemaAvailable) {
    return <SelectionUnavailable />;
  }

  const validSchoolIds = new Set(memberships.map(({ school_id }) => school_id));
  if (validSchoolIds.size === 0) {
    if (profile.role === "superadmin") {
      redirect("/dashboard/admin");
    }
    redirect("/no-school");
  }

  if (validSchoolIds.size === 1 && profile.role !== "superadmin") {
    try {
      const context = resolveActiveSchoolContext({ profile, memberships });
      redirect(getDashboardPathForRole(context.role));
    } catch (error) {
      if (!(error instanceof SchoolContextError)) {
        throw error;
      }
    }
  }

  const schools = [...validSchoolIds].flatMap((schoolId) => {
    const schoolMemberships = memberships.filter(
      (membership) => membership.school_id === schoolId
    );
    const school = schoolMemberships.at(0)?.school;
    return school
      ? [
          {
            school,
            roles: [...new Set(schoolMemberships.map(({ role }) => role))]
          }
        ]
      : [];
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-2xl">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">
            Selecciona tu centro
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Solo se muestran centros con una membership activa.
          </p>
        </div>

        {searchParams?.error ? (
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No se pudo activar ese centro. Revisa que siga disponible para tu cuenta.
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {schools.map(({ school, roles }) => (
            <form
              key={school.id}
              action={selectActiveSchool}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <input type="hidden" name="school_id" value={school.id} />
              <div className="flex items-center gap-3">
                <SchoolLogo
                  size="md"
                  src={school.logo_url ?? undefined}
                  name={school.name}
                  initials={initialsFor(school.short_name)}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {school.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {roles.map(getRoleLabel).join(" · ")}
                  </p>
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Entrar en este centro
              </button>
            </form>
          ))}
        </div>

        <form action="/logout" method="post" className="mt-6 text-center">
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesion
          </button>
        </form>
      </section>
    </main>
  );
}

function SelectionUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700 shadow-sm">
        No se pudo consultar la configuracion de centros. Intentalo de nuevo mas tarde.
      </section>
    </main>
  );
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
