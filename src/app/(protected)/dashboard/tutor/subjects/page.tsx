import Link from "next/link";
import { BookOpenCheck, CalendarCheck, GraduationCap, Layers3, MessageSquarePlus, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getStudentsForCourse, getSubjectCoursesForTeacher, type GradebookCourse } from "@/lib/grades/grades";

export default async function TutorSubjectsPage() {
  const profile = await requireRole("tutor");
  const { items, errorMessage } = await getSubjectCoursesForTeacher(profile.id);
  const courseIds = Array.from(new Set(items.flatMap((item) => item.courses.map((course) => course.id))));
  const studentsByCourseEntries = await Promise.all(
    courseIds.map(async (courseId) => {
      const { students } = await getStudentsForCourse(courseId);
      return [courseId, students] as const;
    })
  );
  const studentsByCourse = new Map(studentsByCourseEntries);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Mis materias</h1>
        <p className="mt-1 text-sm text-muted-foreground">Materias asignadas y acceso al flujo materia → curso → alumno.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar las materias: {errorMessage}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No tienes materias asignadas.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.subject.id} className="rounded-lg border border-border bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Layers3 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{item.subject.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.courses.length} curso{item.courses.length === 1 ? "" : "s"} asociado{item.courses.length === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {item.courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    subjectId={item.subject.id}
                    students={studentsByCourse.get(course.id) ?? []}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <Link href="/dashboard/tutor" className="inline-flex text-sm font-medium text-primary hover:underline">
        Volver al dashboard
      </Link>
    </section>
  );
}

function CourseCard({
  course,
  subjectId,
  students
}: {
  course: GradebookCourse;
  subjectId: string;
  students: { id: string; name: string; last_name: string }[];
}) {
  const gradebookHref = `/dashboard/tutor/gradebook?course_id=${course.id}&subject_id=${subjectId}&term=1&assessment_type=parcial&assessment_name=Parcial%201`;

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">{course.name}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {students.length} alumno{students.length === 1 ? "" : "s"} activo{students.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href={`/dashboard/tutor/attendance?course_id=${course.id}`} icon={CalendarCheck} label="Pasar lista" />
          <ActionLink href={gradebookHref} icon={BookOpenCheck} label="Cuaderno" primary />
        </div>
      </div>

      {students.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No hay alumnos activos en este curso.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {students.map((student) => (
            <li key={student.id}>
              <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-foreground">
                  {student.name} {student.last_name}
                </span>
                <div className="flex flex-wrap gap-2">
                  <ActionLink href={`/dashboard/tutor/students/${student.id}`} icon={UserRound} label="Ficha" />
                  <ActionLink href={`/dashboard/tutor/students/${student.id}#enviar-aviso`} icon={MessageSquarePlus} label="Comunicar" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  primary = false
}: {
  href: string;
  icon: typeof BookOpenCheck;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-95"
          : "border border-border bg-white text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
