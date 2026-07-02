import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminCourses,
  getAdminProfiles,
  getAdminStudents,
  getProfileDisplayName,
  type AdminCourse,
  type AdminProfile,
  type AdminStudent
} from "@/lib/admin/admin";
import { createAdminStudent, toggleAdminStudentActive, updateAdminStudent } from "../actions";

export default async function AdminStudentsPage() {
  await requireRole("superadmin");
  const [{ students, errorMessage }, { courses }, { profiles }] = await Promise.all([
    getAdminStudents(),
    getAdminCourses(),
    getAdminProfiles()
  ]);
  const tutors = profiles.filter((profile) => profile.role === "tutor" && profile.active);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Alumnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Alta, edición, curso, tutor y estado activo.</p>
      </div>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Crear alumno</h2>
        <StudentForm courses={courses} tutors={tutors} action={createAdminStudent} submitLabel="Crear alumno" />
      </section>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los alumnos: {errorMessage}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay alumnos registrados.
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((student) => (
            <article key={student.id} className="rounded-lg border border-border bg-white p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {student.name} {student.last_name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {student.active ? "Activo" : "Inactivo"} · ID {student.id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/admin/students/${student.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
                  >
                    Ver ficha
                  </Link>
                  <form action={toggleAdminStudentActive}>
                    <input type="hidden" name="id" value={student.id} />
                    <input type="hidden" name="active" value={String(student.active)} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
                    >
                      {student.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              </div>

              <StudentForm
                student={student}
                courses={courses}
                tutors={tutors}
                action={updateAdminStudent}
                submitLabel="Guardar cambios"
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StudentForm({
  student,
  courses,
  tutors,
  action,
  submitLabel
}: {
  student?: AdminStudent;
  courses: AdminCourse[];
  tutors: AdminProfile[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 lg:grid-cols-2">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <input
        name="name"
        placeholder="Nombre"
        defaultValue={student?.name ?? ""}
        required
        className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <input
        name="last_name"
        placeholder="Apellidos"
        defaultValue={student?.last_name ?? ""}
        required
        className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <input
        name="birth_date"
        type="date"
        defaultValue={student?.birth_date ?? ""}
        className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <select
        name="course_id"
        defaultValue={student?.course_id ?? ""}
        required
        className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        <option value="" disabled>
          Selecciona curso
        </option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
      <select
        name="tutor_teacher_id"
        defaultValue={student?.tutor_teacher_id ?? ""}
        required
        className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 lg:col-span-2"
      >
        <option value="" disabled>
          Selecciona tutor
        </option>
        {tutors.map((tutor) => (
          <option key={tutor.id} value={tutor.id}>
            {getProfileDisplayName(tutor)}
          </option>
        ))}
      </select>
      <div className="lg:col-span-2">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
