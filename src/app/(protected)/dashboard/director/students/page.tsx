import { requireRole } from "@/lib/auth/session";
import { getAdminCourses } from "@/lib/admin/admin";
import { getDirectorStudents } from "@/lib/director/students";
import {
  StudentDirectoryFilters,
  StudentDirectoryHeader,
  StudentDirectoryList,
} from "@/components/students/student-directory";
import { GradebookBadge } from "@/components/grades/gradebook-design";

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
  const directoryStudents = filteredStudents.map((student) => ({
    id: student.id,
    name: student.name,
    lastName: student.last_name,
    courseName: student.courses?.name ?? student.course_id,
    active: student.active,
    href: `/dashboard/director/students/${student.id}`,
    meta: "Supervisión académica",
  }));

  return (
    <section className="space-y-5">
      <StudentDirectoryHeader
        eyebrow="Supervisión"
        title="Alumnos"
        description="Busca alumnos, filtra por curso y accede a una ficha de supervisión consistente con EduCore."
      >
        <GradebookBadge tone="blue">{filteredStudents.length} alumnos</GradebookBadge>
      </StudentDirectoryHeader>

      <StudentDirectoryFilters
        courses={courses}
        query={searchParams.q}
        selectedCourseId={searchParams.course_id}
        cleanHref="/dashboard/director/students"
      />

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo cargar el listado de alumnos: {errorMessage}
        </div>
      ) : (
        <StudentDirectoryList students={directoryStudents} />
      )}
    </section>
  );
}