import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAdminCourses } from "@/lib/admin/admin";
import { getDirectorStudents, type DirectorStudentListItem } from "@/lib/director/students";

type DirectorStudentsPageProps = {
  searchParams: {
    course_id?: string;
    q?: string;
  };
};

export default async function DirectorStudentsPage({ searchParams }: DirectorStudentsPageProps) {
  await requireRole("director");
  const [{ students, errorMessage }, { courses }] = await Promise.all([getDirectorStudents(), getAdminCourses()]);
  const query = (searchParams.q ?? "").trim().toLocaleLowerCase("es");
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.name} ${student.last_name}`.toLocaleLowerCase("es");

    return (
      (!searchParams.course_id || student.course_id === searchParams.course_id) &&
      (!query || fullName.includes(query))
    );
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Alumnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Listado general de alumnos para supervisión de dirección.
        </p>
      </div>

      <form className="grid gap-3 rounded-lg border border-border bg-white p-5 md:grid-cols-[1fr_1fr_auto]">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Buscar por nombre o apellidos"
          className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <select
          name="course_id"
          defaultValue={searchParams.course_id ?? ""}
          className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="">Todos los cursos</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
        <button className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
          Filtrar
        </button>
      </form>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar el listado de alumnos: {errorMessage}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay alumnos para los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <ul className="divide-y divide-border">
            {filteredStudents.map((student) => (
              <DirectorStudentItem key={student.id} student={student} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DirectorStudentItem({ student }: { student: DirectorStudentListItem }) {
  return (
    <li>
      <Link
        href={`/dashboard/director/students/${student.id}`}
        className="flex flex-col gap-3 px-5 py-4 transition hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">
              {student.name} {student.last_name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{student.courses?.name ?? student.course_id}</p>
          </div>
        </div>
        <span className="w-fit rounded-md border border-border px-2 py-1 text-xs font-medium">
          {student.active ? "Activo" : "Inactivo"}
        </span>
      </Link>
    </li>
  );
}
