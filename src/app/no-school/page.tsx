import { Building2, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getUserSchoolMemberships } from "@/lib/schools/context";

export default async function NoSchoolPage() {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login");
  }

  const { memberships } = await getUserSchoolMemberships(profile.id);
  if (memberships.length > 0) {
    redirect("/select-school");
  }
  if (profile.role === "superadmin") {
    redirect("/dashboard/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-slate-950">
          Sin centro activo
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          No tienes ningun centro activo asignado. Contacta con la administracion
          de tu centro para revisar el acceso.
        </p>
        <form action="/logout" method="post" className="mt-6">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesion
          </button>
        </form>
      </section>
    </main>
  );
}
