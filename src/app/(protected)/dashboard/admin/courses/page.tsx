import { requireRole } from "@/lib/auth/session";
import { getAdminCourses, type AdminCourse } from "@/lib/admin/admin";
import { createAdminCourse, updateAdminCourse } from "../actions";

export default async function AdminCoursesPage() {
  await requireRole("superadmin");
  const { courses, errorMessage } = await getAdminCourses();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Cursos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Listado y mantenimiento de cursos del centro.</p>
      </div>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Crear curso</h2>
        <form action={createAdminCourse} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            name="name"
            placeholder="Nombre del curso"
            required
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Crear
          </button>
        </form>
      </section>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los cursos: {errorMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <CourseForm key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}

function CourseForm({ course }: { course: AdminCourse }) {
  return (
    <form action={updateAdminCourse} className="grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-[1fr_auto]">
      <input type="hidden" name="id" value={course.id} />
      <input
        name="name"
        defaultValue={course.name}
        required
        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
      >
        Guardar
      </button>
    </form>
  );
}
