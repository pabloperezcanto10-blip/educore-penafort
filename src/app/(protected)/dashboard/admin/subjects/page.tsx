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
import { createAdminSubject, createAdminTeacherAssignment, updateAdminSubject } from "../actions";

export default async function AdminSubjectsPage() {
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
  const errorMessage = subjectsError ?? coursesError ?? profilesError ?? assignmentsError ?? courseSubjectsError;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Asignaturas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de materias y asignaciones profesor-curso-asignatura.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la gestión de asignaturas: {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Crear asignatura</h2>
        <form action={createAdminSubject} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            name="name"
            placeholder="Nombre de la asignatura"
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

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Asignar profesor</h2>
        <form action={createAdminTeacherAssignment} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Select name="teacher_id" label="Profesor" options={teachers.map((teacher) => ({
            value: teacher.id,
            label: getProfileDisplayName(teacher)
          }))} />
          <Select name="course_id" label="Curso" options={courses.map((course) => ({
            value: course.id,
            label: course.name
          }))} />
          <Select name="subject_id" label="Asignatura" options={subjects.map((subject) => ({
            value: subject.id,
            label: subject.name
          }))} />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center self-end rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Asignar
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Asignaturas registradas</h2>
        {subjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No hay asignaturas registradas.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {subjects.map((subject) => (
              <SubjectForm key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Materias por curso</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Currículo activo del centro para que los selectores muestren materias reales por curso.
          </p>
        </div>
        {courseSubjectGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No hay materias asociadas a cursos.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {courseSubjectGroups.map((group) => (
              <article key={group.courseId} className="rounded-lg border border-border bg-white p-4">
                <h3 className="text-sm font-semibold text-foreground">{group.courseName}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={`${item.id}-${item.track ?? "base"}`}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {item.subjectName}
                      {item.optional ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          Optativa
                        </span>
                      ) : null}
                      {item.track && item.track !== "comun" ? (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          {formatTrack(item.track)}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Asignaciones activas</h2>
        {assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No hay asignaciones registradas.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Profesor</th>
                    <th className="px-4 py-3 text-left font-medium">Curso</th>
                    <th className="px-4 py-3 text-left font-medium">Asignatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignments.map((assignment) => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      teachersById={teachersById}
                      coursesById={coursesById}
                      subjectsById={subjectsById}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

function groupCourseSubjects(courseSubjects: CourseSubject[]) {
  const groups = new Map<string, { courseId: string; courseName: string; items: CourseSubject[] }>();

  courseSubjects.forEach((item) => {
    const group = groups.get(item.course_id) ?? {
      courseId: item.course_id,
      courseName: item.courseName,
      items: []
    };

    group.items.push(item);
    groups.set(item.course_id, group);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es"))
    }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName, "es"));
}

function formatTrack(track: string) {
  return track
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function Select({
  name,
  label,
  options
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        required
        defaultValue=""
        className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        <option value="" disabled>
          Selecciona
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubjectForm({ subject }: { subject: AdminSubject }) {
  return (
    <form action={updateAdminSubject} className="grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="id" value={subject.id} />
      <input
        name="name"
        defaultValue={subject.name}
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

function AssignmentRow({
  assignment,
  teachersById,
  coursesById,
  subjectsById
}: {
  assignment: AdminTeacherAssignment;
  teachersById: Map<string, AdminProfile>;
  coursesById: Map<string, AdminCourse>;
  subjectsById: Map<string, AdminSubject>;
}) {
  const teacher = teachersById.get(assignment.teacher_id);
  const course = coursesById.get(assignment.course_id);
  const subject = assignment.subject_id ? subjectsById.get(assignment.subject_id) : null;

  return (
    <tr>
      <td className="px-4 py-3">{teacher ? getProfileDisplayName(teacher) : assignment.teacher_id}</td>
      <td className="px-4 py-3">{course?.name ?? assignment.course_id}</td>
      <td className="px-4 py-3">{subject?.name ?? assignment.subject_id ?? "Sin asignatura"}</td>
    </tr>
  );
}
