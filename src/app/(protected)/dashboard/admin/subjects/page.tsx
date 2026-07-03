import Link from "next/link";
import { Layers3, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getActiveCourseSubjects, type CourseSubject } from "@/lib/subjects";
import {
  getAdminCourses,
  getAdminProfiles,
  getAdminSubjects,
  getAdminTeacherAssignments,
  getProfileDisplayName,
  type AdminCourse,
  type AdminProfile,
  type AdminSubject,
  type AdminTeacherAssignment
} from "@/lib/admin/admin";
import {
  createAdminSubject,
  createAdminTeacherAssignmentsBulk,
  deleteAdminTeacherAssignment,
  deleteAdminTeacherAssignmentGroup,
  updateAdminSubject
} from "../actions";

type AdminSubjectsPageProps = {
  searchParams?: {
    teacher_id?: string;
    subject_id?: string | string[];
    course_id?: string | string[];
    assigned?: string;
    created?: string;
    existing?: string;
    errors?: string;
  };
};

export default async function AdminSubjectsPage({ searchParams }: AdminSubjectsPageProps) {
  await requireRole("superadmin");
  const [
    { subjects, errorMessage: subjectsError },
    { courses, errorMessage: coursesError },
    { profiles, errorMessage: profilesError },
    { assignments, errorMessage: assignmentsError },
    { courseSubjects, errorMessage: courseSubjectsError }
  ] = await Promise.all([
    getAdminSubjects(),
    getAdminCourses(),
    getAdminProfiles(),
    getAdminTeacherAssignments(),
    getActiveCourseSubjects()
  ]);
  const teachers = profiles.filter((profile) => profile.role === "tutor" && profile.active);
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const courseSubjectGroups = groupCourseSubjects(courseSubjects);
  const assignmentGroups = groupAssignments(assignments, teachersById, subjectsById, coursesById);
  const preview = buildAssignmentPreview({ searchParams, assignments, teachersById, subjectsById, coursesById });
  const errorMessage = subjectsError ?? coursesError ?? profilesError ?? assignmentsError ?? courseSubjectsError;
  const result = searchParams?.assigned === "1"
    ? {
        created: parseNumber(searchParams.created),
        existing: parseNumber(searchParams.existing),
        errors: parseNumber(searchParams.errors)
      }
    : null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Asignaturas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona materias y asigna cursos al profesorado de forma masiva.
          </p>
        </div>
        <Link href="/dashboard/admin/create?type=teacher" className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
          Crear docente
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la gestion de asignaturas: {errorMessage}
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Asignaciones nuevas" value={result.created} tone="success" />
          <Metric label="Ya existentes" value={result.existing} tone="warning" />
          <Metric label="Errores" value={result.errors} tone="danger" />
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Crear asignatura</h2>
        <form action={createAdminSubject} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            name="name"
            placeholder="Nombre de la asignatura"
            required
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
            Crear
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Asignacion docente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona un docente, varias materias y varios cursos. Se crean todas las combinaciones sin duplicar.
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-3">
          <Select name="teacher_id" label="Docente" defaultValue={preview.teacherId}>
            <option value="" disabled>Selecciona docente</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{getProfileDisplayName(teacher)}</option>)}
          </Select>
          <MultiSelect name="subject_id" label="Materias" options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))} selected={preview.subjectIds} />
          <MultiSelect name="course_id" label="Cursos" options={courses.map((course) => ({ value: course.id, label: course.name }))} selected={preview.courseIds} />
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted lg:col-span-3 lg:w-fit">
            Vista previa
          </button>
        </form>

        <div className="mt-5 rounded-lg border border-border bg-[#f8fafc] p-4">
          <h3 className="text-sm font-semibold text-foreground">Vista previa</h3>
          {preview.rows.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Selecciona docente, materias y cursos para ver las combinaciones.</p>
          ) : (
            <>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Metric label="Nuevas" value={preview.rows.filter((row) => !row.exists).length} tone="success" />
                <Metric label="Ya existen" value={preview.rows.filter((row) => row.exists).length} tone="warning" />
                <Metric label="Errores" value={0} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {preview.rows.map((row) => (
                  <span key={`${row.subjectId}-${row.courseId}`} className={`rounded-full border px-3 py-1 text-xs font-semibold ${row.exists ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {row.subjectName} · {row.courseName} · {row.exists ? "ya existe" : "nueva"}
                  </span>
                ))}
              </div>
              <form action={createAdminTeacherAssignmentsBulk} className="mt-5">
                <input type="hidden" name="teacher_id" value={preview.teacherId} />
                {preview.subjectIds.map((subjectId) => <input key={subjectId} type="hidden" name="subject_id" value={subjectId} />)}
                {preview.courseIds.map((courseId) => <input key={courseId} type="hidden" name="course_id" value={courseId} />)}
                <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
                  Crear asignaciones
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Asignaturas registradas</h2>
        {subjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">No hay asignaturas registradas.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {subjects.map((subject) => <SubjectForm key={subject.id} subject={subject} />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Asignaciones actuales</h2>
          <p className="mt-1 text-sm text-muted-foreground">Agrupadas por docente y materia para evitar listas infinitas.</p>
        </div>
        {assignmentGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">No hay asignaciones registradas.</div>
        ) : (
          <div className="space-y-3">
            {assignmentGroups.map((group) => <TeacherAssignmentsGroup key={group.teacherId} group={group} />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Materias por curso</h2>
          <p className="mt-1 text-sm text-muted-foreground">Curriculo activo del centro para que los selectores muestren materias reales por curso.</p>
        </div>
        {courseSubjectGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">No hay materias asociadas a cursos.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {courseSubjectGroups.map((group) => <CourseSubjectGroup key={group.courseId} group={group} />)}
          </div>
        )}
      </section>
    </section>
  );
}

type AssignmentPreviewRow = {
  subjectId: string;
  subjectName: string;
  courseId: string;
  courseName: string;
  exists: boolean;
};

function buildAssignmentPreview({
  searchParams,
  assignments,
  teachersById,
  subjectsById,
  coursesById
}: {
  searchParams: AdminSubjectsPageProps["searchParams"];
  assignments: AdminTeacherAssignment[];
  teachersById: Map<string, AdminProfile>;
  subjectsById: Map<string, AdminSubject>;
  coursesById: Map<string, AdminCourse>;
}) {
  const teacherId = asSingle(searchParams?.teacher_id);
  const subjectIds = asArray(searchParams?.subject_id);
  const courseIds = asArray(searchParams?.course_id);
  const existingKeys = new Set(assignments.map((assignment) => `${assignment.teacher_id}|${assignment.subject_id}|${assignment.course_id}`));

  if (!teacherId || !teachersById.has(teacherId)) {
    return { teacherId, subjectIds, courseIds, rows: [] as AssignmentPreviewRow[] };
  }

  const rows = subjectIds.flatMap((subjectId) => {
    const subject = subjectsById.get(subjectId);
    if (!subject) return [];

    return courseIds.flatMap((courseId) => {
      const course = coursesById.get(courseId);
      if (!course) return [];

      return [{
        subjectId,
        subjectName: subject.name,
        courseId,
        courseName: course.name,
        exists: existingKeys.has(`${teacherId}|${subjectId}|${courseId}`)
      }];
    });
  });

  return { teacherId, subjectIds, courseIds, rows };
}

function groupAssignments(
  assignments: AdminTeacherAssignment[],
  teachersById: Map<string, AdminProfile>,
  subjectsById: Map<string, AdminSubject>,
  coursesById: Map<string, AdminCourse>
) {
  const teacherGroups = new Map<string, {
    teacherId: string;
    teacherName: string;
    subjects: Map<string, {
      subjectId: string;
      subjectName: string;
      courses: Array<{ assignmentId: string; courseName: string }>;
    }>;
  }>();

  assignments.forEach((assignment) => {
    if (!assignment.subject_id) return;
    const teacher = teachersById.get(assignment.teacher_id);
    const subject = subjectsById.get(assignment.subject_id);
    const course = coursesById.get(assignment.course_id);
    if (!teacher || !subject || !course) return;

    const teacherGroup = teacherGroups.get(teacher.id) ?? {
      teacherId: teacher.id,
      teacherName: getProfileDisplayName(teacher),
      subjects: new Map()
    };
    const subjectGroup = teacherGroup.subjects.get(subject.id) ?? {
      subjectId: subject.id,
      subjectName: subject.name,
      courses: []
    };

    subjectGroup.courses.push({ assignmentId: assignment.id, courseName: course.name });
    teacherGroup.subjects.set(subject.id, subjectGroup);
    teacherGroups.set(teacher.id, teacherGroup);
  });

  return Array.from(teacherGroups.values())
    .map((group) => ({
      ...group,
      subjects: Array.from(group.subjects.values()).map((subject) => ({
        ...subject,
        courses: subject.courses.sort((a, b) => a.courseName.localeCompare(b.courseName, "es"))
      })).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es"))
    }))
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName, "es"));
}

function TeacherAssignmentsGroup({ group }: { group: ReturnType<typeof groupAssignments>[number] }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">{group.teacherName}</h3>
      <div className="mt-4 space-y-3">
        {group.subjects.map((subject) => (
          <div key={subject.subjectId} className="rounded-md border border-border bg-[#f8fafc] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">{subject.subjectName}</p>
              <form action={deleteAdminTeacherAssignmentGroup}>
                <input type="hidden" name="teacher_id" value={group.teacherId} />
                <input type="hidden" name="subject_id" value={subject.subjectId} />
                <button type="submit" className="inline-flex h-8 items-center gap-2 rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 transition hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Quitar materia
                </button>
              </form>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {subject.courses.map((course) => (
                <form key={course.assignmentId} action={deleteAdminTeacherAssignment}>
                  <input type="hidden" name="id" value={course.assignmentId} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-muted">
                    {course.courseName}
                    <Trash2 className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function CourseSubjectGroup({ group }: { group: { courseId: string; courseName: string; items: CourseSubject[] } }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-foreground">{group.courseName}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {group.items.map((item) => (
          <span key={`${item.id}-${item.track ?? "base"}`} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
            {item.subjectName}
            {item.optional ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">Optativa</span> : null}
            {item.track && item.track !== "comun" ? <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-primary">{formatTrack(item.track)}</span> : null}
          </span>
        ))}
      </div>
    </article>
  );
}

function groupCourseSubjects(courseSubjects: CourseSubject[]) {
  const groups = new Map<string, { courseId: string; courseName: string; items: CourseSubject[] }>();

  courseSubjects.forEach((item) => {
    const group = groups.get(item.course_id) ?? { courseId: item.course_id, courseName: item.courseName, items: [] };
    group.items.push(item);
    groups.set(item.course_id, group);
  });

  return Array.from(groups.values())
    .map((group) => ({ ...group, items: group.items.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es")) }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName, "es"));
}

function Select({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select name={name} required defaultValue={defaultValue} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
        {children}
      </select>
    </label>
  );
}

function MultiSelect({ name, label, options, selected }: { name: string; label: string; options: { value: string; label: string }[]; selected: string[] }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select name={name} multiple required defaultValue={selected} className="min-h-36 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <span className="text-xs text-muted-foreground">Mantén Ctrl pulsado para seleccionar varias opciones.</span>
    </label>
  );
}

function SubjectForm({ subject }: { subject: AdminSubject }) {
  return (
    <form action={updateAdminSubject} className="grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="id" value={subject.id} />
      <input name="name" defaultValue={subject.name} required className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
      <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">Guardar</button>
    </form>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : tone === "danger" ? "text-red-700" : "text-foreground";

  return <div className="rounded-md border border-border bg-white px-3 py-2"><p className={`text-lg font-semibold ${toneClass}`}>{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function formatTrack(track: string) {
  return track.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" / ");
}

function asArray(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseNumber(value: string | string[] | undefined) {
  const parsed = Number(asSingle(value));
  return Number.isFinite(parsed) ? parsed : 0;
}
