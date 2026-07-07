import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, BookOpenCheck, MessageSquarePlus, Search, UserRound, Users } from "lucide-react";

import { GradebookBadge, GradebookCard, GradebookCardHeader, StudentAvatar } from "@/components/grades/gradebook-design";
import { requireRole } from "@/lib/auth/session";
import { getActiveCourses } from "@/lib/courses";
import {
  getStudentsForCourse,
  getSubjectCoursesForTeacher,
  type GradebookCourse,
  type Subject,
} from "@/lib/grades/grades";
import { getStudentsWithCourseForTutor, type TutorStudentWithCourse } from "@/lib/tutors/students";

type SearchParams = {
  q?: string;
  course_id?: string;
  subject_id?: string;
  mode?: string;
};

type TeachingGroup = {
  key: string;
  subject: Subject;
  course: GradebookCourse;
  students: TutorStudentWithCourse[];
};

type SelectedGroup =
  | {
      kind: "teaching";
      key: string;
      title: string;
      subtitle: string;
      students: TutorStudentWithCourse[];
      subject: Subject;
      course: GradebookCourse;
    }
  | {
      kind: "tutoring";
      key: "tutoria";
      title: string;
      subtitle: string;
      students: TutorStudentWithCourse[];
    };

export default async function TutorStudentsPage({ searchParams }: { searchParams?: SearchParams }) {
  const profile = await requireRole("tutor");
  const query = searchParams?.q?.trim() ?? "";

  const [tutorStudentsResult, subjectCoursesResult, activeCoursesResult] = await Promise.all([
    getStudentsWithCourseForTutor(profile.id),
    getSubjectCoursesForTeacher(profile.id),
    getActiveCourses(),
  ]);

  const tutorStudents = tutorStudentsResult.students;
  const subjectCourses = subjectCoursesResult.items;
  const activeCourses = activeCoursesResult.courses;
  const courseIds = Array.from(
    new Set(subjectCourses.flatMap((entry) => entry.courses.map((course) => course.id))),
  );
  const studentsByCourseEntries = await Promise.all(
    courseIds.map(async (courseId) => {
      const result = await getStudentsForCourse(courseId);
      return [courseId, result.students] as const;
    }),
  );
  const studentsByCourse = new Map(studentsByCourseEntries);

  const teachingGroups: TeachingGroup[] = sortTeachingGroups(subjectCourses
    .flatMap((entry) =>
      entry.courses.map((course) => {
        const courseStudents = (studentsByCourse.get(course.id) ?? []).map((student) => ({
          ...student,
          course_id: course.id,
          courses: course,
        })) as TutorStudentWithCourse[];

        return {
          key: `${entry.subject.id}-${course.id}`,
          subject: entry.subject,
          course,
          students: filterStudents(courseStudents, query),
        };
      }),
    )
    .filter((group) => !searchParams?.course_id || group.course.id === searchParams.course_id)
    .filter((group) => !searchParams?.subject_id || group.subject.id === searchParams.subject_id));

  const filteredTutorStudents = filterStudents(tutorStudents, query);
  const tutorStudentIds = new Set(tutorStudents.map((student) => student.id));
  const courses = mergeCourses(activeCourses, subjectCourses.flatMap((entry) => entry.courses));
  const subjects = mergeSubjects(subjectCourses.map((entry) => entry.subject));
  const selectedGroup = resolveSelectedGroup(teachingGroups, filteredTutorStudents, searchParams);
  const errorMessage =
    tutorStudentsResult.errorMessage ?? subjectCoursesResult.errorMessage ?? activeCoursesResult.errorMessage ?? null;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Tutoría y docencia</p>
          <h1 className="text-3xl font-bold text-slate-950">Mis alumnos</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Localiza un grupo, filtra por curso o materia y accede rápido a la ficha o comunicación del alumno.
          </p>
        </div>
        <GradebookBadge tone="blue">{filteredTutorStudents.length} alumnos en tutoría</GradebookBadge>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
      ) : null}

      <FilterForm courses={courses} subjects={subjects} searchParams={searchParams} />

      <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
        <ClassSidebar
          groups={teachingGroups}
          tutorStudents={filteredTutorStudents}
          selectedGroup={selectedGroup}
          searchParams={searchParams}
        />
        <StudentsPanel selectedGroup={selectedGroup} tutorStudentIds={tutorStudentIds} query={query} searchParams={searchParams} />
      </div>
    </section>
  );
}

function FilterForm({
  courses,
  subjects,
  searchParams,
}: {
  courses: GradebookCourse[];
  subjects: Subject[];
  searchParams?: SearchParams;
}) {
  return (
    <GradebookCard className="p-4">
      <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto_auto] lg:items-end">
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          <span>Buscar alumno</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Nombre o apellidos"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </label>

        <Select label="Curso" name="course_id" defaultValue={searchParams?.course_id ?? ""}>
          <option value="">Todos</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </Select>

        <Select label="Materia" name="subject_id" defaultValue={searchParams?.subject_id ?? ""}>
          <option value="">Todas</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </Select>

        <button
          type="submit"
          className="h-11 rounded-xl bg-sky-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-100"
        >
          Filtrar
        </button>
        <Link
          href="/dashboard/tutor/students"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
        >
          Limpiar
        </Link>
      </form>
    </GradebookCard>
  );
}

function ClassSidebar({
  groups,
  tutorStudents,
  selectedGroup,
  searchParams,
}: {
  groups: TeachingGroup[];
  tutorStudents: TutorStudentWithCourse[];
  selectedGroup: SelectedGroup | null;
  searchParams?: SearchParams;
}) {
  return (
    <GradebookCard className="p-3">
      <div className="border-b border-slate-100 px-2 pb-3">
        <GradebookCardHeader title="Mis clases" />
        <p className="px-5 pb-2 text-sm text-slate-500">Selecciona una clase para ver solo sus alumnos.</p>
      </div>

      <div className="mt-3 space-y-2">
        {groups.length ? (
          groups.map((group) => (
            <ClassNavItem
              key={group.key}
              href={buildStudentsHref(searchParams, {
                course_id: group.course.id,
                subject_id: group.subject.id,
                mode: undefined,
              })}
              icon={BookOpenCheck}
              title={group.subject.name}
              subtitle={group.course.name}
              count={group.students.length}
              active={selectedGroup?.kind === "teaching" && selectedGroup.key === group.key}
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            No hay clases que coincidan con los filtros.
          </p>
        )}
      </div>

      {tutorStudents.length ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Seguimiento</p>
          <div className="mt-2">
            <ClassNavItem
              href={buildStudentsHref(searchParams, {
                mode: "tutoria",
                course_id: undefined,
                subject_id: undefined,
              })}
              icon={Users}
              title="Tutoría"
              subtitle="Alumnos asignados"
              count={tutorStudents.length}
              active={selectedGroup?.kind === "tutoring"}
              emphasis
            />
          </div>
        </div>
      ) : null}
    </GradebookCard>
  );
}

function ClassNavItem({
  href,
  icon: Icon,
  title,
  subtitle,
  count,
  active,
  emphasis = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  count: number;
  active: boolean;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-sky-200 bg-sky-50 shadow-sm"
          : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-sky-700 text-white" : emphasis ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">{title}</span>
        <span className="block truncate text-xs text-slate-500">{subtitle}</span>
      </span>
      <GradebookBadge tone={active ? "blue" : "gray"}>{count}</GradebookBadge>
    </Link>
  );
}

function StudentsPanel({
  selectedGroup,
  tutorStudentIds,
  query,
  searchParams,
}: {
  selectedGroup: SelectedGroup | null;
  tutorStudentIds: Set<string>;
  query: string;
  searchParams?: SearchParams;
}) {
  if (!selectedGroup) {
    return (
      <GradebookCard className="flex min-h-[420px] items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">Selecciona una clase</h2>
          <p className="mt-1 text-sm text-slate-500">
            Estás viendo tu lista general de clases. Elige una materia, curso o tutoría para abrir una lista compacta de alumnos.
          </p>
        </div>
      </GradebookCard>
    );
  }

  return (
    <GradebookCard className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
            {selectedGroup.kind === "tutoring" ? "Seguimiento integral" : "Grupo de docencia"}
          </p>
          <h2 className="text-xl font-bold text-slate-950">{selectedGroup.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{selectedGroup.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildStudentsHref(searchParams, { course_id: undefined, subject_id: undefined, mode: undefined })}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a mis clases
          </Link>
          <GradebookBadge tone="blue">{selectedGroup.students.length} alumnos</GradebookBadge>
        </div>
      </div>

      <div className="border-b border-slate-100 px-5 pt-4">
        <div className="flex gap-2">
          <span className="rounded-t-xl border border-b-0 border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800">
            Alumnos
          </span>
          <span className="rounded-t-xl border border-b-0 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
            Resumen
          </span>
          <span className="rounded-t-xl border border-b-0 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
            Comunicación
          </span>
        </div>
      </div>

      {selectedGroup.students.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Curso</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Tutoría</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {selectedGroup.students.map((student) => {
                const studentName = getStudentDisplayName(student);

                return (
                  <tr key={student.id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <StudentAvatar name={studentName} />
                        <div>
                          <p className="font-semibold text-slate-950">{studentName}</p>
                          <p className="text-xs text-slate-500">Alumno</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{student.courses?.name ?? "Sin curso"}</td>
                    <td className="px-5 py-3">
                      <GradebookBadge tone="green">Activo</GradebookBadge>
                    </td>
                    <td className="px-5 py-3">
                      {tutorStudentIds.has(student.id) ? (
                        <GradebookBadge tone="blue">Sí</GradebookBadge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <ActionLink href={`/dashboard/tutor/students/${student.id}`} icon={UserRound}>
                          Ficha
                        </ActionLink>
                        <ActionLink href={`/dashboard/tutor/students/${student.id}#enviar-aviso`} icon={MessageSquarePlus} variant="secondary">
                          Comunicar
                        </ActionLink>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-14 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-950">No hay alumnos en esta vista</h3>
          <p className="mt-1 text-sm text-slate-500">
            {query ? "Prueba a ajustar la búsqueda o limpiar los filtros." : "Este grupo todavía no tiene alumnos asignados."}
          </p>
        </div>
      )}
    </GradebookCard>
  );
}

function Select({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      >
        {children}
      </select>
    </label>
  );
}

function ActionLink({
  href,
  icon: Icon,
  children,
  variant = "primary",
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition focus:outline-none focus:ring-4 ${
        variant === "primary"
          ? "bg-sky-700 text-white shadow-sm hover:bg-sky-800 focus:ring-sky-100"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-100"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}

function resolveSelectedGroup(
  groups: TeachingGroup[],
  tutorStudents: TutorStudentWithCourse[],
  searchParams?: SearchParams,
): SelectedGroup | null {
  if (searchParams?.mode === "tutoria" && tutorStudents.length) {
    return {
      kind: "tutoring",
      key: "tutoria",
      title: "Tutoría",
      subtitle: "Seguimiento integral de tus alumnos asignados.",
      students: tutorStudents,
    };
  }

  const selectedTeachingGroup = searchParams?.course_id && searchParams?.subject_id
    ? groups.find((group) => group.course.id === searchParams.course_id && group.subject.id === searchParams.subject_id)
    : null;

  if (selectedTeachingGroup) {
    return {
      kind: "teaching",
      key: selectedTeachingGroup.key,
      title: selectedTeachingGroup.subject.name,
      subtitle: selectedTeachingGroup.course.name,
      students: selectedTeachingGroup.students,
      subject: selectedTeachingGroup.subject,
      course: selectedTeachingGroup.course,
    };
  }

  return null;
}

function buildStudentsHref(searchParams: SearchParams | undefined, updates: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const nextParams = { ...searchParams, ...updates };

  Object.entries(nextParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/dashboard/tutor/students?${query}` : "/dashboard/tutor/students";
}

function mergeCourses(activeCourses: GradebookCourse[], assignedCourses: GradebookCourse[]) {
  const map = new Map<string, GradebookCourse>();

  activeCourses.forEach((course) => map.set(course.id, course));
  assignedCourses.forEach((course) => map.set(course.id, course));

  return sortCourses(Array.from(map.values()));
}

function mergeSubjects(subjects: Subject[]) {
  const map = new Map<string, Subject>();
  subjects.forEach((subject) => map.set(subject.id, subject));
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function filterStudents(students: TutorStudentWithCourse[], query: string) {
  if (!query) {
    return students;
  }

  const normalizedQuery = query.toLowerCase();
  return students.filter((student) => getStudentDisplayName(student).toLowerCase().includes(normalizedQuery));
}

function getStudentDisplayName(student: Pick<TutorStudentWithCourse, "name" | "last_name">) {
  return `${student.name} ${student.last_name}`.trim();
}

function sortTeachingGroups(groups: TeachingGroup[]) {
  return [...groups].sort((a, b) => {
    const courseOrder = getCourseSortRank(a.course.name) - getCourseSortRank(b.course.name);
    if (courseOrder !== 0) {
      return courseOrder;
    }

    return a.subject.name.localeCompare(b.subject.name, "es");
  });
}

function sortCourses(courses: GradebookCourse[]) {
  return [...courses].sort((a, b) => {
    const courseOrder = getCourseSortRank(a.name) - getCourseSortRank(b.name);
    if (courseOrder !== 0) {
      return courseOrder;
    }

    return a.name.localeCompare(b.name, "es");
  });
}

function getCourseSortRank(courseName: string) {
  const normalizedName = courseName.toLowerCase();
  const stageOffset = normalizedName.includes("bachiller")
    ? 20
    : normalizedName.includes("eso")
      ? 10
      : normalizedName.includes("primaria")
        ? 0
        : 100;
  const numberMatch = normalizedName.match(/(\d+)/);
  const courseNumber = numberMatch ? Number(numberMatch[1]) : 99;

  return stageOffset + courseNumber;
}

