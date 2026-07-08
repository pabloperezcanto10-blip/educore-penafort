import Link from "next/link";
import { BookOpen, CheckCircle2, GraduationCap, LibraryBig, UserPlus, UsersRound, type LucideIcon } from "lucide-react";
import { GradebookBadge, GradebookCard } from "@/components/grades/gradebook-design";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminCourses,
  getAdminProfiles,
  getAdminStudents,
  getAdminSubjects,
  getProfileDisplayName,
  getStudentDisplayName
} from "@/lib/admin/admin";
import {
  createAdminCourseQuick,
  createAdminFamilyQuick,
  createAdminStudent,
  createAdminSubjectQuick,
  createAdminTeacherQuick
} from "../actions";
import { MultiCheckboxSelect } from "./multi-checkbox-select";

type CreateType = "student" | "family" | "teacher" | "subject" | "course";

const createTypes = new Set<CreateType>(["student", "family", "teacher", "subject", "course"]);

export default async function AdminCreatePage({
  searchParams
}: {
  searchParams: { type?: string; created?: string; email?: string; assignments?: string };
}) {
  await requireRole("superadmin");
  const selectedType = createTypes.has(searchParams.type as CreateType) ? (searchParams.type as CreateType) : null;
  const [
    { courses, errorMessage: coursesError },
    { profiles, errorMessage: profilesError },
    { students, errorMessage: studentsError },
    { subjects, errorMessage: subjectsError }
  ] = await Promise.all([
    getAdminCourses(),
    getAdminProfiles(),
    getAdminStudents(),
    getAdminSubjects()
  ]);
  const tutors = profiles.filter((profile) => profile.role === "tutor" && profile.active);
  const sortedCourses = [...courses].sort((a, b) => compareCourseNames(a.name, b.name));
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  const pageError = coursesError ?? profilesError ?? studentsError ?? subjectsError;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Página de creación</h1>
          <p className="mt-1 text-sm text-slate-500">
            Alta rápida de perfiles, relaciones y estructuras del centro.
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte de la página de creación: {pageError}
        </div>
      ) : null}

      {searchParams.created && searchParams.email ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                {searchParams.created === "teacher" ? "Profesor creado correctamente" : "Usuario creado"}
              </p>
              <p className="mt-1">correo: {searchParams.email}</p>
              <p>contraseña temporal: ********</p>
              {searchParams.created === "teacher" ? (
                <p className="mt-2 text-emerald-700">
                  Se han creado {Number(searchParams.assignments ?? 0)} asignaciones.
                </p>
              ) : null}
              <p className="mt-2 text-emerald-700">
                Al iniciar sesión será redirigido a cambiar la contraseña.
              </p>
              {searchParams.created === "teacher" ? (
                <Link
                  href="/dashboard/admin/subjects"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                >
                  Ir a Asignación docente
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`grid gap-5 ${selectedType ? "" : "xl:grid-cols-2"}`}>
        <CreateCard
          type="student"
          selectedType={selectedType}
          title="Crear alumno"
          description="Alta directa de alumno con curso y tutor asignado."
          icon={GraduationCap}
        >
          <form action={createAdminStudent} className="grid gap-5">
            <GradebookCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <SectionIntro
                  icon={GraduationCap}
                  title="Datos personales"
                  description="Registra la identidad básica del alumno antes de asignarlo a un curso."
                />
                <GradebookBadge tone="blue">Alumno</GradebookBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input name="name" label="Nombre" required />
                <Input name="last_name" label="Apellidos" required />
                <Input name="birth_date" label="Fecha de nacimiento" type="date" />
              </div>
            </GradebookCard>

            <GradebookCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <SectionIntro
                  icon={BookOpen}
                  title="Curso y tutoría"
                  description="Selecciona el grupo académico y el tutor responsable del seguimiento."
                />
                <GradebookBadge tone="gray">Obligatorio</GradebookBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Select
                  name="course_id"
                  label="Curso"
                  options={sortedCourses.map((course) => ({ value: course.id, label: course.name }))}
                  required
                />
                <Select
                  name="tutor_teacher_id"
                  label="Tutor"
                  options={tutors.map((tutor) => ({ value: tutor.id, label: getProfileDisplayName(tutor) }))}
                  required
                />
              </div>
            </GradebookCard>

            <CreationSummary
              title="Resumen antes de crear"
              description="El alumno quedará vinculado al curso y tutor seleccionados. Después podrás completar relaciones familiares desde Familias o Importación."
              actionLabel="Crear alumno"
            />
          </form>
        </CreateCard>

        <CreateCard
          type="family"
          selectedType={selectedType}
          title="Crear familia"
          description="Alta de usuario familiar y vínculo opcional con alumno."
          icon={UsersRound}
        >
          <form action={createAdminFamilyQuick} className="grid gap-5">
            <GradebookCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <SectionIntro
                  icon={UsersRound}
                  title="Datos de acceso familiar"
                  description="Crea el usuario de familia con email y contraseña temporal."
                />
                <GradebookBadge tone="blue">Familia</GradebookBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input name="full_name" label="Nombre" required />
                <Input name="email" label="Email" type="email" required />
                <Input
                  name="temporary_password"
                  label="Contraseña temporal"
                  type="password"
                  placeholder="Penafort2026!"
                />
              </div>
            </GradebookCard>

            <GradebookCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <SectionIntro
                  icon={GraduationCap}
                  title="Vinculación con alumno"
                  description="Puedes relacionar la familia con un alumno ahora o hacerlo más adelante desde Familias."
                />
                <GradebookBadge tone="gray">Opcional</GradebookBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Select
                  name="student_id"
                  label="Relacionar con alumno"
                  options={students.map((student) => ({ value: student.id, label: getStudentDisplayName(student) }))}
                />
              </div>
            </GradebookCard>

            <CreationSummary
              title="Resumen antes de crear"
              description="La familia recibirá un usuario con contraseña temporal y deberá cambiarla en el primer acceso. El teléfono no se solicita en EduCore."
              actionLabel="Crear familia"
            />
          </form>
        </CreateCard>

        <CreateCard
          type="teacher"
          selectedType={selectedType}
          title="Crear profesor"
          description="Alta de usuario docente con asignación inicial opcional de cursos y materias."
          icon={UserPlus}
        >
          <form action={createAdminTeacherQuick} className="grid gap-5">
            <GradebookCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <UserPlus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Datos del profesor</h3>
                    <p className="mt-1 text-sm text-slate-500">Crea el acceso docente con contraseña temporal y rol inicial.</p>
                  </div>
                </div>
                <GradebookBadge tone="blue">Alta docente</GradebookBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input name="full_name" label="Nombre" required />
                <Input name="email" label="Email" type="email" required />
                <Input
                  name="temporary_password"
                  label="Contraseña temporal"
                  type="password"
                  placeholder="Penafort2026!"
                />
                <Select
                  name="role"
                  label="Rol"
                  defaultValue="tutor"
                  options={[
                    { value: "tutor", label: "Tutor / profesor" },
                    { value: "director", label: "Director" },
                    { value: "superadmin", label: "Superadmin" }
                  ]}
                  required
                />
              </div>
            </GradebookCard>

            <div className="grid gap-4 xl:grid-cols-2">
              <MultiCheckboxSelect
                name="course_id"
                label="Cursos"
                helpText="Selecciona uno o varios cursos. Podrás modificar estas asignaciones más adelante."
                options={sortedCourses.map((course) => ({ value: course.id, label: course.name }))}
                emptyText="No hay cursos disponibles."
              />
              <MultiCheckboxSelect
                name="subject_id"
                label="Materias"
                helpText="Selecciona una o varias materias. Las combinaciones se crearán automáticamente al guardar."
                options={sortedSubjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                emptyText="No hay materias disponibles."
              />
            </div>

            <GradebookCard className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-950">Resumen antes de crear</h3>
                    <GradebookBadge tone="gray">Asignación opcional</GradebookBadge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Si seleccionas cursos y materias, EduCore creará automáticamente todas las combinaciones. Si lo dejas vacío, podrás asignarlas después desde Asignación docente.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                  <Link
                    href="/dashboard/admin/subjects"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ir a Asignación docente
                  </Link>
                  <SubmitButton label="Crear profesor" inline />
                </div>
              </div>
            </GradebookCard>
          </form>
        </CreateCard>
        <CreateCard
          type="subject"
          selectedType={selectedType}
          title="Crear materia"
          description="Alta de materia y asignación opcional a profesor y curso."
          icon={LibraryBig}
        >
          <form action={createAdminSubjectQuick} className="grid gap-3 md:grid-cols-2">
            <Input name="name" label="Nombre" required className="md:col-span-2" />
            <Select
              name="course_id"
              label="Curso opcional"
              options={courses.map((course) => ({ value: course.id, label: course.name }))}
            />
            <Select
              name="teacher_id"
              label="Profesor opcional"
              options={tutors.map((tutor) => ({ value: tutor.id, label: getProfileDisplayName(tutor) }))}
            />
            <SubmitButton label="Crear materia" />
          </form>
        </CreateCard>

        <CreateCard
          type="course"
          selectedType={selectedType}
          title="Crear curso"
          description="Alta rápida de curso del centro."
          icon={BookOpen}
        >
          <form action={createAdminCourseQuick} className="grid gap-3 md:grid-cols-2">
            <Input name="name" label="Nombre" required className="md:col-span-2" />
            <Select
              name="tutor_teacher_id"
              label="Tutor opcional"
              options={tutors.map((tutor) => ({ value: tutor.id, label: getProfileDisplayName(tutor) }))}
              className="md:col-span-2"
            />
            <SubmitButton label="Crear curso" />
          </form>
        </CreateCard>
      </div>
    </section>
  );
}

function CreateCard({
  type,
  selectedType,
  title,
  description,
  icon: Icon,
  children
}: {
  type: CreateType;
  selectedType: CreateType | null;
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const isSelected = selectedType === type;

  if (selectedType && !isSelected) {
    return null;
  }

  return (
    <section
      id={type}
      className={`rounded-lg border bg-white p-5 shadow-sm ${
        isSelected ? "border-sky-200 ring-2 ring-sky-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            {isSelected ? (
              <GradebookBadge tone="blue">Seleccionado</GradebookBadge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionIntro({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sky-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function CreationSummary({
  title,
  description,
  actionLabel
}: {
  title: string;
  description: string;
  actionLabel: string;
}) {
  return (
    <GradebookCard className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
            <GradebookBadge tone="green">Listo para guardar</GradebookBadge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="lg:shrink-0">
          <SubmitButton label={actionLabel} inline />
        </div>
      </div>
    </GradebookCard>
  );
}

function Input({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  className = ""
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="block text-sm font-semibold text-slate-950">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  required = false,
  defaultValue = "",
  className = ""
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="block text-sm font-semibold text-slate-950">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      >
        <option value="" disabled={required}>
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

function SubmitButton({ label, inline = false }: { label: string; inline?: boolean }) {
  return (
    <div className={inline ? "" : "md:col-span-2"}>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800"
      >
        {label}
      </button>
    </div>
  );
}



const courseOrder = [
  "1º primaria",
  "2º primaria",
  "3º primaria",
  "4º primaria",
  "5º primaria",
  "6º primaria",
  "1º eso",
  "2º eso",
  "3º eso",
  "4º eso",
  "1º bachiller",
  "1º bachillerato",
  "2º bachiller",
  "2º bachillerato"
];

function compareCourseNames(a: string, b: string) {
  const normalizedA = normalizeCourseName(a);
  const normalizedB = normalizeCourseName(b);
  const indexA = courseOrder.findIndex((item) => normalizedA.includes(item));
  const indexB = courseOrder.findIndex((item) => normalizedB.includes(item));

  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
  }

  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function normalizeCourseName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


