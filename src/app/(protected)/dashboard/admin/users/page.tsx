import { requireRole } from "@/lib/auth/session";
import { getAdminProfiles, getProfileDisplayName, type AdminProfile } from "@/lib/admin/admin";
import { ROLE_LABELS, ROLES } from "@/lib/auth/roles";
import { toggleAdminUserActive, updateAdminUserRole } from "../actions";
import { DeleteUserForm } from "./delete-user-form";

export default async function AdminUsersPage() {
  await requireRole("superadmin");
  const { profiles, errorMessage } = await getAdminProfiles();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestion de perfiles, roles y estado de acceso.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los usuarios: {errorMessage}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Rol</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => (
                  <AdminUserRow key={profile.id} profile={profile} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function AdminUserRow({ profile }: { profile: AdminProfile }) {
  const canToggleActive = profile.role === "family" || profile.role === "tutor";

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{getProfileDisplayName(profile)}</td>
      <td className="px-4 py-3">{profile.email ?? "-"}</td>
      <td className="px-4 py-3">{ROLE_LABELS[profile.role]}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            profile.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {profile.active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex min-w-80 flex-wrap gap-2">
          <form action={updateAdminUserRole} className="flex gap-2">
            <input type="hidden" name="id" value={profile.id} />
            <select
              name="role"
              defaultValue={profile.role}
              className="h-10 min-w-36 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Guardar
            </button>
          </form>

          {canToggleActive ? (
            <>
              <form action={toggleAdminUserActive}>
                <input type="hidden" name="id" value={profile.id} />
                <input type="hidden" name="role" value={profile.role} />
                <input type="hidden" name="active" value={String(profile.active)} />
                <button
                  type="submit"
                  className={`inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition ${
                    profile.active
                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {profile.active ? "Desactivar" : "Reactivar"}
                </button>
              </form>

              <DeleteUserForm id={profile.id} role={profile.role} />
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
