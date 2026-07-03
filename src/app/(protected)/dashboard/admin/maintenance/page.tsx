import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  GraduationCap,
  Link2,
  Upload,
  Users,
  UserRoundCog,
  Wrench
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminCourses,
  getAdminFamilyRelations,
  getAdminProfiles,
  getAdminStudents,
  getAdminSubjects,
  getAdminTeacherAssignments
} from "@/lib/admin/admin";
import { getAcademicYears } from "@/lib/academic-years";

const modules = [
  {
    title: "Curso escolar",
    description: "Ver curso activo, crear cursos escolares y preparar promocion futura.",
    href: "/dashboard/admin/academic-years",
    icon: CalendarCheck,
    actions: [
      { label: "Ver activo", href: "/dashboard/admin/academic-years" },
      { label: "Crear curso escolar", href: "/dashboard/admin/academic-years" },
      { label: "Activar curso", href: "/dashboard/admin/academic-years" }
    ],
    metricKey: "academicYears"
  },
  {
    title: "Cursos",
    description: "Crear cursos reales y editar nombre dentro del curso escolar activo.",
    href: "/dashboard/admin/courses",
    icon: BookOpen,
    actions: [
      { label: "Crear curso", href: "/dashboard/admin/create?type=course" },
      { label: "Editar nombre", href: "/dashboard/admin/courses" }
    ],
    metricKey: "courses"
  },
  {
    title: "Materias",
    description: "Crear, editar y asignar materias a profesores y cursos.",
    href: "/dashboard/admin/subjects",
    icon: GraduationCap,
    actions: [
      { label: "Crear", href: "/dashboard/admin/create?type=subject" },
      { label: "Editar", href: "/dashboard/admin/subjects" },
      { label: "Asignar profesor", href: "/dashboard/admin/subjects" },
      { label: "Asignar curso", href: "/dashboard/admin/subjects" }
    ],
    metricKey: "subjects"
  },
  {
    title: "Alumnos",
    description: "Crear alumnos reales, mover de curso, asignar tutor y activar o desactivar.",
    href: "/dashboard/admin/students",
    icon: Users,
    actions: [
      { label: "Crear", href: "/dashboard/admin/create?type=student" },
      { label: "Editar", href: "/dashboard/admin/students" },
      { label: "Mover de curso", href: "/dashboard/admin/students" },
      { label: "Activar/desactivar", href: "/dashboard/admin/students" }
    ],
    metricKey: "students"
  },
  {
    title: "Familias",
    description: "Gestionar relaciones entre familias y alumnos.",
    href: "/dashboard/admin/families",
    icon: Link2,
    actions: [
      { label: "Crear familia", href: "/dashboard/admin/create?type=family" },
      { label: "Vincular", href: "/dashboard/admin/families" },
      { label: "Desvincular", href: "/dashboard/admin/families" },
      { label: "Editar perfil", href: "/dashboard/admin/users" }
    ],
    metricKey: "families"
  },
  {
    title: "Profesores",
    description: "Gestionar perfiles docentes y asignaciones de curso y materia.",
    href: "/dashboard/admin/create?type=teacher",
    icon: UserRoundCog,
    actions: [
      { label: "Crear profesor", href: "/dashboard/admin/create?type=teacher" },
      { label: "Editar rol", href: "/dashboard/admin/users" },
      { label: "Asignar curso", href: "/dashboard/admin/subjects" },
      { label: "Asignar materia", href: "/dashboard/admin/subjects" }
    ],
    metricKey: "teachers"
  },
  {
    title: "Importación masiva",
    description: "Importa alumnos y familias por clase automáticamente.",
    href: "/dashboard/admin/import",
    icon: Upload,
    actions: [
      { label: "Abrir importación", href: "/dashboard/admin/import" },
      { label: "Vista previa", href: "/dashboard/admin/import" },
      { label: "Importar alumnos", href: "/dashboard/admin/import" }
    ],
    metricKey: "students"
  },
  {
    title: "Usuarios",
    description: "Revisar perfiles y cambiar roles de acceso.",
    href: "/dashboard/admin/users",
    icon: UserRoundCog,
    actions: [
      { label: "Cambiar roles", href: "/dashboard/admin/users" },
      { label: "Revisar email", href: "/dashboard/admin/users" },
      { label: "Ver perfiles", href: "/dashboard/admin/users" }
    ],
    metricKey: "users"
  }
] as const;

export default async function AdminMaintenancePage() {
  await requireRole("superadmin");
  const [
    { courses, errorMessage: coursesError },
    { subjects, errorMessage: subjectsError },
    { students, errorMessage: studentsError },
    { profiles, errorMessage: profilesError },
    { relations, errorMessage: relationsError },
    { assignments, errorMessage: assignmentsError },
    { academicYears, errorMessage: academicYearsError }
  ] = await Promise.all([
    getAdminCourses(),
    getAdminSubjects(),
    getAdminStudents(),
    getAdminProfiles(),
    getAdminFamilyRelations(),
    getAdminTeacherAssignments(),
    getAcademicYears()
  ]);
  const teachers = profiles.filter((profile) => profile.role === "tutor" && profile.active);
  const families = profiles.filter((profile) => profile.role === "family" && profile.active);
  const pageError = coursesError ?? subjectsError ?? studentsError ?? profilesError ?? relationsError ?? assignmentsError ?? academicYearsError;
  const metrics = {
    academicYears: academicYears.length,
    courses: courses.length,
    subjects: subjects.length,
    students: students.length,
    families: families.length,
    teachers: teachers.length,
    users: profiles.length
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Mantenimiento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centro de operaciones para cursos, materias, alumnos, familias, profesores y usuarios.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte del mantenimiento: {pageError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Alumnos activos" value={students.filter((student) => student.active).length} />
        <Metric label="Asignaciones docentes" value={assignments.length} />
        <Metric label="Relaciones familiares" value={relations.length} />
        <Metric label="Usuarios registrados" value={profiles.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <article
              key={module.title}
              className="rounded-lg border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Link href={module.href} className="text-sm font-semibold text-foreground hover:text-primary">
                      {module.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                  </div>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {module.actions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>

              <p className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                {metrics[module.metricKey]} registro{metrics[module.metricKey] === 1 ? "" : "s"}
              </p>
            </article>
          );
        })}
      </div>

      <section className="rounded-lg border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Estado de mantenimiento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Las tarjetas enlazan a formularios reales que escriben en Supabase. Cursos, alumnos, materias,
              asignaciones docentes y relaciones familiares se gestionan desde sus rutas operativas.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
