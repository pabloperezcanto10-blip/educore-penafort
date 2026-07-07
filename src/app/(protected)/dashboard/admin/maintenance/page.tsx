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
  Wrench,
  type LucideIcon
} from "lucide-react";

import { WorkCenterTabs } from "@/components/dashboard/work-center-tabs";
import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
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

type MaintenanceTab = "estructura" | "personas" | "importacion" | "usuarios" | "estado";
type MetricKey = "academicYears" | "courses" | "subjects" | "students" | "families" | "teachers" | "relations" | "assignments" | "users";

type MaintenanceModule = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  actions: Array<{ label: string; href: string; primary?: boolean }>;
  metricKey: MetricKey;
  tab: MaintenanceTab;
};

type MaintenanceMetrics = Record<MetricKey, number> & {
  activeStudents: number;
  inactiveUsers: number;
};

const maintenanceTabs: Array<{ id: MaintenanceTab; label: string }> = [
  { id: "estructura", label: "Estructura" },
  { id: "personas", label: "Personas" },
  { id: "importacion", label: "Importación" },
  { id: "usuarios", label: "Usuarios" },
  { id: "estado", label: "Estado" }
];

const modules: MaintenanceModule[] = [
  {
    title: "Curso escolar",
    description: "Ver curso activo, crear cursos escolares y preparar promoción futura.",
    href: "/dashboard/admin/academic-years",
    icon: CalendarCheck,
    actions: [
      { label: "Ver activo", href: "/dashboard/admin/academic-years", primary: true },
      { label: "Crear curso escolar", href: "/dashboard/admin/academic-years" },
      { label: "Activar curso", href: "/dashboard/admin/academic-years" }
    ],
    metricKey: "academicYears",
    tab: "estructura"
  },
  {
    title: "Cursos",
    description: "Crear cursos reales y editar nombre dentro del curso escolar activo.",
    href: "/dashboard/admin/courses",
    icon: BookOpen,
    actions: [
      { label: "Crear curso", href: "/dashboard/admin/create?type=course", primary: true },
      { label: "Editar nombre", href: "/dashboard/admin/courses" }
    ],
    metricKey: "courses",
    tab: "estructura"
  },
  {
    title: "Materias",
    description: "Crear, editar y asignar materias a profesores y cursos.",
    href: "/dashboard/admin/subjects",
    icon: GraduationCap,
    actions: [
      { label: "Crear", href: "/dashboard/admin/create?type=subject", primary: true },
      { label: "Editar", href: "/dashboard/admin/subjects" },
      { label: "Asignar profesor", href: "/dashboard/admin/subjects" },
      { label: "Asignar curso", href: "/dashboard/admin/subjects" }
    ],
    metricKey: "subjects",
    tab: "estructura"
  },
  {
    title: "Alumnos",
    description: "Crear alumnos reales, mover de curso, asignar tutor y activar o desactivar.",
    href: "/dashboard/admin/students",
    icon: Users,
    actions: [
      { label: "Crear", href: "/dashboard/admin/create?type=student", primary: true },
      { label: "Editar", href: "/dashboard/admin/students" },
      { label: "Mover de curso", href: "/dashboard/admin/students" },
      { label: "Activar/desactivar", href: "/dashboard/admin/students" }
    ],
    metricKey: "students",
    tab: "personas"
  },
  {
    title: "Familias",
    description: "Gestionar relaciones entre familias y alumnos.",
    href: "/dashboard/admin/families",
    icon: Link2,
    actions: [
      { label: "Crear familia", href: "/dashboard/admin/create?type=family", primary: true },
      { label: "Vincular", href: "/dashboard/admin/families" },
      { label: "Desvincular", href: "/dashboard/admin/families" },
      { label: "Editar perfil", href: "/dashboard/admin/users" }
    ],
    metricKey: "families",
    tab: "personas"
  },
  {
    title: "Profesores",
    description: "Gestionar perfiles docentes y asignaciones de curso y materia.",
    href: "/dashboard/admin/create?type=teacher",
    icon: UserRoundCog,
    actions: [
      { label: "Crear profesor", href: "/dashboard/admin/create?type=teacher", primary: true },
      { label: "Editar rol", href: "/dashboard/admin/users" },
      { label: "Asignar curso", href: "/dashboard/admin/subjects" },
      { label: "Asignar materia", href: "/dashboard/admin/subjects" }
    ],
    metricKey: "teachers",
    tab: "personas"
  },
  {
    title: "Relaciones familiares",
    description: "Vincular o revisar alumnos asociados a cada familia.",
    href: "/dashboard/admin/families",
    icon: Link2,
    actions: [
      { label: "Gestionar relaciones", href: "/dashboard/admin/families", primary: true },
      { label: "Crear familia", href: "/dashboard/admin/create?type=family" }
    ],
    metricKey: "relations",
    tab: "personas"
  },
  {
    title: "Asignaciones docentes",
    description: "Asignar materias y cursos a docentes sin duplicar combinaciones.",
    href: "/dashboard/admin/subjects",
    icon: GraduationCap,
    actions: [
      { label: "Asignación docente", href: "/dashboard/admin/subjects", primary: true },
      { label: "Crear profesor", href: "/dashboard/admin/create?type=teacher" }
    ],
    metricKey: "assignments",
    tab: "personas"
  },
  {
    title: "Importación masiva",
    description: "Importa alumnos y familias por clase automáticamente.",
    href: "/dashboard/admin/import",
    icon: Upload,
    actions: [
      { label: "Abrir importación", href: "/dashboard/admin/import", primary: true },
      { label: "Vista previa", href: "/dashboard/admin/import" },
      { label: "Importar alumnos", href: "/dashboard/admin/import" },
      { label: "Borrar datos", href: "/dashboard/admin/import?tab=cleanup" }
    ],
    metricKey: "students",
    tab: "importacion"
  },
  {
    title: "Usuarios",
    description: "Revisar perfiles, roles, accesos y cambios de contraseña pendientes.",
    href: "/dashboard/admin/users",
    icon: UserRoundCog,
    actions: [
      { label: "Ver perfiles", href: "/dashboard/admin/users", primary: true },
      { label: "Cambiar roles", href: "/dashboard/admin/users" },
      { label: "Revisar email", href: "/dashboard/admin/users" }
    ],
    metricKey: "users",
    tab: "usuarios"
  }
];

type AdminMaintenancePageProps = {
  searchParams?: {
    work_tab?: string;
  };
};

export default async function AdminMaintenancePage({ searchParams }: AdminMaintenancePageProps) {
  await requireRole("superadmin");
  const activeTab = normalizeMaintenanceTab(searchParams?.work_tab);
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
  const metrics: MaintenanceMetrics = {
    academicYears: academicYears.length,
    courses: courses.length,
    subjects: subjects.length,
    students: students.length,
    activeStudents: students.filter((student) => student.active).length,
    families: families.length,
    teachers: teachers.length,
    relations: relations.length,
    assignments: assignments.length,
    users: profiles.length,
    inactiveUsers: profiles.filter((profile) => profile.active === false).length
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Mantenimiento</h1>
          <p className="mt-1 text-sm text-slate-500">
            Centro operativo para cursos, materias, alumnos, familias, profesores y usuarios.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Volver al panel
        </Link>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar parte del mantenimiento: {pageError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Alumnos activos" value={metrics.activeStudents} />
        <SummaryMetric label="Asignaciones docentes" value={metrics.assignments} />
        <SummaryMetric label="Relaciones familiares" value={metrics.relations} />
        <SummaryMetric label="Usuarios registrados" value={metrics.users} />
      </div>

      <GradebookCard>
        <GradebookCardHeader title="Centro de mantenimiento">
          <GradebookBadge tone={pageError ? "amber" : "green"}>{pageError ? "Revisar estado" : "Operativo"}</GradebookBadge>
        </GradebookCardHeader>
        <WorkCenterTabs
          initialTab={activeTab}
          tabs={maintenanceTabs}
          basePath="/dashboard/admin/maintenance"
          ariaLabel="Centro de mantenimiento"
          panels={[
            { id: "estructura", content: <MaintenanceModuleList modules={modules.filter((module) => module.tab === "estructura")} metrics={metrics} /> },
            { id: "personas", content: <MaintenanceModuleList modules={modules.filter((module) => module.tab === "personas")} metrics={metrics} /> },
            { id: "importacion", content: <ImportMaintenancePanel metrics={metrics} /> },
            { id: "usuarios", content: <UsersMaintenancePanel metrics={metrics} /> },
            { id: "estado", content: <MaintenanceStatusPanel pageError={pageError} metrics={metrics} /> }
          ]}
        />
      </GradebookCard>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <GradebookCard className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </GradebookCard>
  );
}

function MaintenanceModuleList({ modules, metrics }: { modules: MaintenanceModule[]; metrics: MaintenanceMetrics }) {
  return (
    <div className="grid gap-3">
      {modules.map((module) => (
        <MaintenanceModuleRow key={module.title} module={module} count={metrics[module.metricKey]} />
      ))}
    </div>
  );
}

function MaintenanceModuleRow({ module, count }: { module: MaintenanceModule; count: number }) {
  const Icon = module.icon;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-slate-50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={module.href} className="text-sm font-semibold text-slate-950 transition hover:text-sky-700">
                {module.title}
              </Link>
              <GradebookBadge tone="gray">{count} registro{count === 1 ? "" : "s"}</GradebookBadge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{module.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {module.actions.map((action) => (
            <Link
              key={`${module.title}-${action.label}`}
              href={action.href}
              className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold transition ${
                action.primary
                  ? "bg-sky-700 text-white hover:bg-sky-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {action.label}
            </Link>
          ))}
          <Link href={module.href} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-sky-700" aria-label={`Abrir ${module.title}`}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ImportMaintenancePanel({ metrics }: { metrics: MaintenanceMetrics }) {
  const importModules = modules.filter((module) => module.tab === "importacion");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <MaintenanceModuleList modules={importModules} metrics={metrics} />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Estado de importación</h3>
        <div className="mt-3 grid gap-2">
          <MiniStatus label="Alumnos actuales" value={metrics.students} />
          <MiniStatus label="Familias activas" value={metrics.families} />
          <MiniStatus label="Relaciones creadas" value={metrics.relations} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          La vista previa, la importación y la limpieza por curso se gestionan desde el módulo operativo de importación.
        </p>
      </div>
    </div>
  );
}

function UsersMaintenancePanel({ metrics }: { metrics: MaintenanceMetrics }) {
  const userModules = modules.filter((module) => module.tab === "usuarios");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <MaintenanceModuleList modules={userModules} metrics={metrics} />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Roles y accesos</h3>
        <div className="mt-3 grid gap-2">
          <MiniStatus label="Usuarios registrados" value={metrics.users} />
          <MiniStatus label="Usuarios inactivos" value={metrics.inactiveUsers} tone={metrics.inactiveUsers > 0 ? "amber" : "green"} />
        </div>
      </div>
    </div>
  );
}

function MaintenanceStatusPanel({ pageError, metrics }: { pageError: string | null; metrics: MaintenanceMetrics }) {
  if (pageError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Hay avisos técnicos en la carga de mantenimiento. Revisa el mensaje superior antes de continuar.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Mantenimiento operativo</h3>
            <p className="mt-1 text-sm text-slate-500">
              Las secciones enlazan a formularios reales que escriben en Supabase. Cursos, alumnos, materias,
              asignaciones docentes y relaciones familiares se gestionan desde sus rutas operativas.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">Resumen estructural</h3>
        <div className="mt-3 grid gap-2">
          <MiniStatus label="Cursos" value={metrics.courses} />
          <MiniStatus label="Materias" value={metrics.subjects} />
          <MiniStatus label="Asignaciones" value={metrics.assignments} />
        </div>
      </div>
    </div>
  );
}

function MiniStatus({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "green" | "amber" }) {
  const toneClass = {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700"
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${toneClass}`}>{value}</span>
    </div>
  );
}

function normalizeMaintenanceTab(value: string | undefined): MaintenanceTab {
  return maintenanceTabs.some((tab) => tab.id === value) ? (value as MaintenanceTab) : "estructura";
}




