import { requireRole } from "@/lib/auth/session";
import {
  getAdminFamilyRelations,
  getAdminProfiles,
  getAdminStudents,
  getProfileDisplayName,
  getStudentDisplayName,
  type AdminParentStudent,
  type AdminProfile,
  type AdminStudent
} from "@/lib/admin/admin";
import { linkAdminFamilyStudent } from "../actions";
import { UnlinkFamilyStudentForm } from "./unlink-family-student-form";

export default async function AdminFamiliesPage() {
  await requireRole("superadmin");
  const [{ profiles, errorMessage: profilesError }, { students }, { relations, errorMessage: relationsError }] =
    await Promise.all([getAdminProfiles(), getAdminStudents(), getAdminFamilyRelations()]);
  const families = profiles.filter((profile) => profile.role === "family" && profile.active);
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const relationsByFamily = new Map<string, AdminParentStudent[]>();

  relations.forEach((relation) => {
    const current = relationsByFamily.get(relation.parent_id) ?? [];
    relationsByFamily.set(relation.parent_id, [...current, relation]);
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Familias</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vinculación entre usuarios family y alumnos.</p>
      </div>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Vincular familia con alumno</h2>
        <form action={linkAdminFamilyStudent} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <select
            name="parent_id"
            required
            defaultValue=""
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="" disabled>
              Selecciona familia
            </option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {getProfileDisplayName(family)}
              </option>
            ))}
          </select>
          <select
            name="student_id"
            required
            defaultValue=""
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="" disabled>
              Selecciona alumno
            </option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {getStudentDisplayName(student)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Vincular
          </button>
        </form>
      </section>

      {profilesError || relationsError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar familias o relaciones: {profilesError ?? relationsError}
        </div>
      ) : families.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay usuarios con rol family.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {families.map((family) => (
            <FamilyCard
              key={family.id}
              family={family}
              relations={relationsByFamily.get(family.id) ?? []}
              studentsById={studentsById}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FamilyCard({
  family,
  relations,
  studentsById
}: {
  family: AdminProfile;
  relations: AdminParentStudent[];
  studentsById: Map<string, AdminStudent>;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <h2 className="text-sm font-semibold text-foreground">{getProfileDisplayName(family)}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{family.email ?? family.id}</p>

      <div className="mt-4 space-y-2">
        {relations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin alumnos vinculados.</p>
        ) : (
          relations.map((relation) => {
            const student = studentsById.get(relation.student_id);

            return (
              <div
                key={`${relation.parent_id}-${relation.student_id}`}
                className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-foreground">
                  {student ? getStudentDisplayName(student) : relation.student_id}
                </span>
                <UnlinkFamilyStudentForm parentId={relation.parent_id} studentId={relation.student_id} />
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
