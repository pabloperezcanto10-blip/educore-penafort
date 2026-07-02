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
  };
};

type TeachingGroup = {
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
  const teachingGroups: TeachingGroup[] = subjectCourses.flatMap((item) =>
    item.courses.map((course) => ({
      subject: item.subject,
      course,
      students: filterStudents(studentsByCourse.get(course.id) ?? [], searchParams.q)
    }))
  ).filter((group) => {
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
            Diferencia entre alumnos que tienes como profesor y alumnos de tu tutoria.
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

      <section className="space-y-4">
        <SectionHeader
          title="Como profesor"
          description="Alumnos por materia y curso asignado para docencia."
          count={teachingGroups.reduce((total, group) => total + group.students.length, 0)}
        />

        {teachingGroups.length === 0 ? (
          <EmptyState text="No hay alumnos de docencia para los filtros seleccionados." />
        ) : (
          <div className="space-y-4">
            {teachingGroups.map((group) => (
              <TeachingGroupCard key={`${group.subject.id}:${group.course.id}`} group={group} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Como tutor"
          description="Alumnos asignados a tu tutoria."
          count={filteredTutorStudents.length}
        />

        {filteredTutorStudents.length === 0 ? (
          <EmptyState text="No hay alumnos de tutoria para los filtros seleccionados." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredTutorStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
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
    <form className="grid gap-3 rounded-lg border border-border bg-white p-5 lg:grid-cols-[1fr_240px_240px_auto_auto]">
      <label className="space-y-2">
        <span className="block text-sm font-medium text-foreground">Buscar</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            name="q"
            defaultValue={searchParams?.q ?? ""}
            placeholder="Nombre o apellidos"
            className="h-11 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
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
        <button className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
          Filtrar
        </button>
      </div>
      <div className="flex items-end">
        <Link
          href="/dashboard/tutor/students"
          className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium transition hover:bg-muted"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function TeachingGroupCard({ group }: { group: TeachingGroup }) {
  const gradebookHref = `/dashboard/tutor/gradebook?course_id=${group.course.id}&subject_id=${group.subject.id}&term=1&assessment_type=parcial&assessment_name=Parcial%201`;

  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{group.subject.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.course.name} · {group.students.length} alumno{group.students.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={gradebookHref}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
        >
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          Cuaderno
        </Link>
      </div>

      {group.students.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No hay alumnos activos en este curso.</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {group.students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </article>
  );
}

function StudentCard({ student }: { student: TutorStudentWithCourse }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {student.name} {student.last_name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{student.courses?.name ?? "Sin curso"}</p>
        </div>
        <Users className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionLink href={`/dashboard/tutor/students/${student.id}`} icon={UserRound} label="Ficha" />
        <ActionLink href={`/dashboard/tutor/students/${student.id}#enviar-aviso`} icon={MessageSquarePlus} label="Comunicar" />
      </div>
    </article>
  );
}

function SectionHeader({ title, description, count }: { title: string; description: string; count: number }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="w-fit rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
        {count} alumno{count === 1 ? "" : "s"}
      </span>
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
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
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
      className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
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
