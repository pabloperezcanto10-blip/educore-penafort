import Link from "next/link";
import { BookOpenCheck, CalendarCheck, GraduationCap, History, Layers3, MessageSquarePlus, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getStudentsForCourse, getSubjectCoursesForTeacher, type GradebookCourse, type GradebookStudent, type TeacherSubjectCourse } from "@/lib/grades/grades";

type TutorSubjectsPageProps = {
  searchParams?: {
    subject_id?: string;
  };
};

export default async function TutorSubjectsPage({ searchParams }: TutorSubjectsPageProps) {
  const profile = await requireRole("tutor");
  const { items, errorMessage } = await getSubjectCoursesForTeacher(profile.id);
  const activeSubject = items.find((item) => item.subject.id === searchParams?.subject_id) ?? items[0] ?? null;
  const courseIds = activeSubject ? activeSubject.courses.map((course) => course.id) : [];
  const studentsByCourseEntries = await Promise.all(
    courseIds.map(async (courseId) => {
      const { students } = await getStudentsForCourse(courseId);
      return [courseId, students] as const;
    })
  );
  const studentsByCourse = new Map(studentsByCourseEntries);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Mis materias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Materias asignadas organizadas por curso. Abre solo el curso que necesites consultar.
          </p>
        </div>
        <Link href="/dashboard/tutor" className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
          Volver al dashboard
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar las materias: {errorMessage}
        </div>
      ) : items.length === 0 || !activeSubject ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No tienes materias asignadas.
        </div>
      ) : (
        <>
          <SubjectTabs items={items} activeSubjectId={activeSubject.subject.id} />
          <SubjectPanel item={activeSubject} studentsByCourse={studentsByCourse} />
        </>
      )}
    </section>
  );
}

function SubjectTabs({ items, activeSubjectId }: { items: TeacherSubjectCourse[]; activeSubjectId: string }) {
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-2 shadow-sm" aria-label="Materias">
      {items.map((item) => {
        const active = item.subject.id === activeSubjectId;

        return (
          <Link
            key={item.subject.id}
            href={`/dashboard/tutor/subjects?subject_id=${item.subject.id}`}
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.subject.name}
          </Link>
        );
      })}
    </nav>
  );
}

function SubjectPanel({
  item,
  studentsByCourse
}: {
  item: TeacherSubjectCourse;
  studentsByCourse: Map<string, GradebookStudent[]>;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-sm">
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

      <div className="mt-5 space-y-3">
        {item.courses.map((course) => (
          <CourseAccordion
            key={course.id}
            course={course}
            subjectId={item.subject.id}
            students={studentsByCourse.get(course.id) ?? []}
          />
        ))}
      </div>
    </article>
  );
}

function CourseAccordion({
  course,
  subjectId,
  students
}: {
  course: GradebookCourse;
  subjectId: string;
  students: GradebookStudent[];
}) {
  const gradebookHref = `/dashboard/tutor/gradebook?course_id=${course.id}&subject_id=${subjectId}&term=1&assessment_type=parcial&assessment_name=Parcial%201`;
  const historyHref = `/dashboard/tutor/attendance-history?course_id=${course.id}&subject_id=${subjectId}`;

  return (
    <details className="group rounded-md border border-border bg-white">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg text-primary transition group-open:rotate-90">▸</span>
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">{course.name}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {students.length} alumno{students.length === 1 ? "" : "s"} activo{students.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href="/dashboard/tutor/schedule" icon={CalendarCheck} label="Pasar lista" />
          <ActionLink href={gradebookHref} icon={BookOpenCheck} label="Cuaderno" primary />
          <ActionLink href={historyHref} icon={History} label="Historial asistencia" />
        </div>
      </summary>

      <div className="border-t border-border px-4 pb-4">
        {students.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No hay alumnos activos en este curso.</p>
        ) : (
          <ul className="divide-y divide-border">
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
    </details>
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
        primary ? "bg-primary text-primary-foreground hover:opacity-95" : "border border-border bg-white text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
