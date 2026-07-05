import Link from "next/link";
import { BookOpenCheck, MessageSquarePlus, Search, UserRound, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getActiveCourses } from "@/lib/courses";
import { getStudentsForCourse, getSubjectCoursesForTeacher, type GradebookCourse, type Subject } from "@/lib/grades/grades";
import { getStudentsWithCourseForTutor, type TutorStudentWithCourse } from "@/lib/tutors/students";

type TutorStudentsPageProps = {
  searchParams?: {
    q?: string;
    course_id?: string;
    subject_id?: string;
    view?: string;
  };
};

type TeachingGroup = {
  id: string;
  subject: Subject;
  course: GradebookCourse;
  students: TutorStudentWithCourse[];
};

export default async function TutorStudentsPage({ searchParams = {} }: TutorStudentsPageProps) {
  const profile = await requireRole("tutor");
  const [
    { students: tutorStudents, errorMessage: tutorStudentsError },
    { items: subjectCourses, errorMessage: subjectsError },
    { courses: activeCourses, errorMessage: coursesError }
  ] = await Promise.all([
    getStudentsWithCourseForTutor(profile.id),
    getSubjectCoursesForTeacher(profile.id),
    getActiveCourses()
  ]);
  const courseIds = Array.from(new Set(subjectCourses.flatMap((item) => item.courses.map((course) => course.id))));
  const studentsByCourseEntries = await Promise.all(
    courseIds.map(async (courseId) => {
      const { students } = await getStudentsForCourse(courseId);
      return [
        courseId,
        students.map((student) => ({
          ...student,
          course_id: courseId,
          courses: {
            name: subjectCourses.flatMap((item) => item.courses).find((course) => course.id === courseId)?.name ?? "Sin curso"
          }
        }))
      ] as const;
    })
  );
  const studentsByCourse = new Map(studentsByCourseEntries);
  const allTeachingGroups: TeachingGroup[] = subjectCourses.flatMap((item) =>
    item.courses.map((course) => ({
      id: `${item.subject.id}:${course.id}`,
      subject: item.subject,
      course,
      students: filterStudents(studentsByCourse.get(course.id) ?? [], searchParams.q)
    }))
  );
  const filteredTeachingGroups = allTeachingGroups.filter((group) => {
    return (
      (!searchParams.course_id || group.course.id === searchParams.course_id) &&
      (!searchParams.subject_id || group.subject.id === searchParams.subject_id)
    );
  });
  const query = (searchParams.q ?? "").trim().toLocaleLowerCase("es");
  const filteredTutorStudents = tutorStudents.filter((student) => {
    const fullName = `${student.name} ${student.last_name}`.toLocaleLowerCase("es");

    return (
      (!query || fullName.includes(query)) &&
      (!searchParams.course_id || student.course_id === searchParams.course_id)
    );
  });
  const isNeutralSelection = searchParams.view === "none";
  const requestedTeachingGroup =
    isNeutralSelection || searchParams.view === "tutoria" || !searchParams.course_id || !searchParams.subject_id
      ? null
      : filteredTeachingGroups.find((group) => group.subject.id === searchParams.subject_id && group.course.id === searchParams.course_id) ?? null;
  const fallbackTeachingGroup = filteredTeachingGroups.find((group) => group.students.length > 0) ?? filteredTeachingGroups[0] ?? null;
  const hasTutorStudents = filteredTutorStudents.length > 0;
  const showTutorGroup = isNeutralSelection ? false : searchParams.view === "tutoria" ? hasTutorStudents : !requestedTeachingGroup && hasTutorStudents;
  const selectedTeachingGroup = isNeutralSelection || showTutorGroup ? null : requestedTeachingGroup ?? fallbackTeachingGroup;
  const hasSelection = showTutorGroup || Boolean(selectedTeachingGroup);
  const selectedTitle = showTutorGroup
    ? "Tutoría"
    : selectedTeachingGroup
      ? `${selectedTeachingGroup.subject.name} · ${selectedTeachingGroup.course.name}`
      : "Sin grupos disponibles";
  const selectedStudents = showTutorGroup ? filteredTutorStudents : selectedTeachingGroup?.students ?? [];
  const selectedCourseName = showTutorGroup
    ? "Seguimiento integral de tus alumnos asignados."
    : selectedTeachingGroup?.course.name ?? "No hay grupos disponibles para los filtros seleccionados.";
  const courses = Array.from(
    new Map(
      [
        ...subjectCourses.flatMap((item) => item.courses),
        ...tutorStudents.map((student) => ({ id: student.course_id, name: student.courses?.name ?? "Sin curso" })),
        ...activeCourses
      ].map((course) => [course.id, course])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const subjects = subjectCourses.map((item) => item.subject).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const errorMessage = tutorStudentsError ?? subjectsError ?? coursesError;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Mis alumnos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Localiza una clase, revisa sus alumnos y accede rapido a ficha, comunicacion o cuaderno.
          </p>
        </div>
        <Link
          href="/dashboard/tutor"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al dashboard
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los alumnos: {errorMessage}
        </div>
      ) : null}

      <FilterForm courses={courses} subjects={subjects} searchParams={searchParams} />

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Grupos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Elige una clase o abre tu tutoría para trabajar con alumnos concretos.
              </p>
            </div>
          </div>

          {hasSelection ? (
            <Link
              href={hrefWith(searchParams, { course_id: undefined, subject_id: undefined, view: "none" })}
              className="mt-4 inline-flex text-sm font-medium text-primary transition hover:text-primary/80"
            >
              ← Restablecer selección
            </Link>
          ) : null}

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grupos de docencia</p>
            <div className="space-y-2">
            {filteredTeachingGroups.length === 0 ? (
              <EmptyState text="No hay clases de docencia para los filtros seleccionados." compact />
            ) : (
              filteredTeachingGroups.map((group) => (
                <GroupLink
                  key={group.id}
                  group={group}
                  active={!showTutorGroup && selectedTeachingGroup?.id === group.id}
                  searchParams={searchParams}
                />
              ))
            )}
            </div>
          </div>

          {hasTutorStudents ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seguimiento tutorial</p>
              <TutorGroupLink
                active={showTutorGroup}
                count={filteredTutorStudents.length}
                searchParams={searchParams}
              />
            </div>
          ) : null}
        </aside>

        <main className="rounded-lg border border-border bg-white shadow-sm">
          {!hasSelection ? (
            <div className="p-4">
              <EmptyState text="Selecciona un grupo de docencia o Tutoría para comenzar." />
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">{showTutorGroup ? "Como tutor" : "Como profesor"}</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">{selectedTitle}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedCourseName} · {selectedStudents.length} alumno{selectedStudents.length === 1 ? "" : "s"}
                  </p>
                </div>
                {!showTutorGroup && selectedTeachingGroup ? (
                  <Link
                    href={getGradebookHref(selectedTeachingGroup)}
                    className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                  >
                    <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                    Abrir cuaderno
                  </Link>
                ) : null}
              </header>

              {selectedStudents.length === 0 ? (
                <div className="p-4">
                  <EmptyState text="No hay alumnos activos en esta selección." />
                </div>
              ) : (
                <StudentList students={selectedStudents} />
              )}
            </>
          )}
        </main>
      </section>
    </section>
  );
}

function FilterForm({
  courses,
  subjects,
  searchParams
}: {
  courses: { id: string; name: string }[];
  subjects: Subject[];
  searchParams: TutorStudentsPageProps["searchParams"];
}) {
  return (
    <form className="rounded-lg border border-border bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_210px_210px_auto_auto]">
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted-foreground">Buscar</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Nombre o apellidos"
              className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </label>
        <Select
          name="course_id"
          label="Curso"
          value={searchParams?.course_id ?? ""}
          options={courses.map((course) => ({ value: course.id, label: course.name }))}
        />
        <Select
          name="subject_id"
          label="Materia"
          value={searchParams?.subject_id ?? ""}
          options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
        />
        <div className="flex items-end">
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
            Filtrar
          </button>
        </div>
        <div className="flex items-end">
          <Link
            href="/dashboard/tutor/students"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium transition hover:bg-muted"
          >
            Limpiar
          </Link>
        </div>
      </div>
    </form>
  );
}

function GroupLink({
  group,
  active,
  searchParams
}: {
  group: TeachingGroup;
  active: boolean;
  searchParams: TutorStudentsPageProps["searchParams"];
}) {
  const href = hrefWith(searchParams, {
    course_id: group.course.id,
    subject_id: group.subject.id,
    view: undefined
  });

  return (
    <Link
      href={href}
      className={`block rounded-md border px-3 py-3 transition ${
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-muted"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{group.subject.name}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{group.course.name}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {group.students.length}
        </span>
      </div>
    </Link>
  );
}

function TutorGroupLink({
  active,
  count,
  searchParams
}: {
  active: boolean;
  count: number;
  searchParams: TutorStudentsPageProps["searchParams"];
}) {
  return (
    <Link
      href={hrefWith(searchParams, { view: "tutoria", subject_id: undefined })}
      className={`block rounded-md border px-3 py-3 transition ${
        active ? "border-primary bg-primary/5" : "border-primary/20 bg-primary/5 hover:bg-primary/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Tutoría</p>
          <p className="mt-1 text-sm text-muted-foreground">Seguimiento integral de tus alumnos.</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-white px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {count}
        </span>
      </div>
    </Link>
  );
}

function StudentList({ students }: { students: TutorStudentWithCourse[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[#f8fafc] text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Alumno</th>
            <th className="px-4 py-3">Curso</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {students.map((student) => (
            <tr key={student.id} className="bg-white">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-foreground">
                    {student.name} {student.last_name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{student.courses?.name ?? "Sin curso"}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <ActionLink href={`/dashboard/tutor/students/${student.id}`} icon={UserRound} label="Ficha" />
                  <ActionLink href={`/dashboard/tutor/students/${student.id}#enviar-aviso`} icon={MessageSquarePlus} label="Comunicar" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Select({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1">
      <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-dashed border-border bg-white text-sm text-muted-foreground ${compact ? "p-4" : "p-6"}`}>
      {text}
    </div>
  );
}

function filterStudents(students: TutorStudentWithCourse[], queryValue: string | undefined) {
  const query = (queryValue ?? "").trim().toLocaleLowerCase("es");

  if (!query) {
    return students;
  }

  return students.filter((student) => `${student.name} ${student.last_name}`.toLocaleLowerCase("es").includes(query));
}

function getGradebookHref(group: TeachingGroup) {
  return `/dashboard/tutor/gradebook?course_id=${group.course.id}&subject_id=${group.subject.id}&term=1&assessment_type=parcial&assessment_name=Parcial%201`;
}

function hrefWith(
  searchParams: TutorStudentsPageProps["searchParams"],
  updates: Record<string, string | undefined>
) {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });

  const query = params.toString();

  return query ? `/dashboard/tutor/students?${query}` : "/dashboard/tutor/students";
}
