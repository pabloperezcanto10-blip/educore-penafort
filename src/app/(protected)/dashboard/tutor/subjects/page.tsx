import Link from "next/link";
import {
  BookOpenCheck,
  CalendarCheck,
  ChevronRight,
  GraduationCap,
  History,
  Layers3,
  MessageSquarePlus,
  UserRound,
  type LucideIcon
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
import {
  getStudentsForCourse,
  getSubjectCoursesForTeacher,
  type GradebookCourse,
  type GradebookStudent,
  type TeacherSubjectCourse
} from "@/lib/grades/grades";

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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Mis materias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Materias asignadas organizadas por curso. Abre solo el curso que necesites consultar.
          </p>
        </div>
        <Link
          href="/dashboard/tutor"
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Volver al dashboard
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar las materias: {errorMessage}
        </div>
      ) : items.length === 0 || !activeSubject ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
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
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Materias">
      {items.map((item) => {
        const active = item.subject.id === activeSubjectId;

        return (
          <Link
            key={item.subject.id}
            href={`/dashboard/tutor/subjects?subject_id=${item.subject.id}`}
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              active ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
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
    <GradebookCard>
      <GradebookCardHeader title={item.subject.name}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Layers3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-slate-500">
            {item.courses.length} curso{item.courses.length === 1 ? "" : "s"} asociado{item.courses.length === 1 ? "" : "s"}.
          </p>
        </div>
        <GradebookBadge tone="blue">{item.courses.length} cursos</GradebookBadge>
      </GradebookCardHeader>

      <div className="space-y-2 p-4">
        {item.courses.map((course) => (
          <CourseAccordion
            key={course.id}
            course={course}
            subjectId={item.subject.id}
            students={studentsByCourse.get(course.id) ?? []}
          />
        ))}
      </div>
    </GradebookCard>
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
    <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ChevronRight className="h-4 w-4 text-sky-700 transition group-open:rotate-90" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-950">{course.name}</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
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

      <div className="border-t border-slate-200 px-3 pb-3">
        {students.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No hay alumnos activos en este curso.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {students.map((student) => (
              <li key={student.id}>
                <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-slate-950">
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
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 w-fit items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
        primary ? "bg-sky-700 text-white hover:bg-sky-800" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}