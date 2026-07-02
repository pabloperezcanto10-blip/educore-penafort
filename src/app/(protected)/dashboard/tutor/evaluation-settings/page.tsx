import Link from "next/link";
import { Settings2, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAssignedCoursesForTeacher,
  getAssignedSubjectsForTeacherCourse,
  getCriteriaWeightTotal,
  getEvaluationCriteria,
  type CriterionType,
  type EvaluationCriterion,
  type GradeTerm
} from "@/lib/grades/grades";
import { deleteEvaluationCriterion, saveEvaluationCriterion } from "../gradebook/actions";
import { EvaluationSettingsFilters } from "./filters";

type EvaluationSettingsPageProps = {
  searchParams: {
    course_id?: string;
    subject_id?: string;
    term?: string;
  };
};

export default async function EvaluationSettingsPage({ searchParams }: EvaluationSettingsPageProps) {
  const profile = await requireRole("tutor");
  const term = normalizeTerm(searchParams.term);
  const { courses, errorMessage: coursesError } = await getAssignedCoursesForTeacher(profile.id);
  const requestedCourseId = searchParams.course_id ?? "";
  const courseId = courses.some((course) => course.id === requestedCourseId) ? requestedCourseId : courses[0]?.id ?? "";
  const { subjects, errorMessage: subjectsError } = await getAssignedSubjectsForTeacherCourse(profile.id, courseId);
  const requestedSubjectId = searchParams.subject_id ?? "";
  const subjectId = subjects.some((subject) => subject.id === requestedSubjectId)
    ? requestedSubjectId
    : subjects.length === 1
      ? subjects[0].id
      : "";
  const { criteria, errorMessage: criteriaError } =
    courseId && subjectId
      ? await getEvaluationCriteria({ teacherId: profile.id, courseId, subjectId, term })
      : { criteria: [], errorMessage: null };
  const weightTotal = getCriteriaWeightTotal(criteria);
  const errorMessage = coursesError ?? subjectsError ?? criteriaError;
  const gradebookHref = `/dashboard/tutor/gradebook?course_id=${courseId}&subject_id=${subjectId}&term=${term}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Criterios de evaluacion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prepara la estructura de calculo antes de introducir notas en el cuaderno.
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
          No se pudieron cargar los criterios: {errorMessage}
        </div>
      ) : null}

      <EvaluationSettingsFilters
        courses={courses}
        subjects={subjects}
        courseId={courseId}
        subjectId={subjectId}
        term={term}
      />

      {!courseId ? (
        <EmptyState message="Selecciona un curso para configurar criterios." />
      ) : subjects.length === 0 ? (
        <EmptyState message="No hay materias asignadas para este curso." />
      ) : !subjectId ? (
        <EmptyState message="Selecciona una materia para configurar criterios." />
      ) : (
        <>
          <section className="rounded-lg border border-border bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Settings2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Configuracion activa</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Puedes crear cualquier combinacion de criterios. El cuaderno solo podra cerrar trimestre cuando sumen 100%.
                  </p>
                </div>
              </div>
              <StatusBadge total={weightTotal} />
            </div>

            {weightTotal !== 100 ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                La suma actual es {weightTotal}%. La configuracion quedara lista cuando alcance exactamente 100%.
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                Configuracion completa. Ya puedes usar estos criterios en el cuaderno.
              </div>
            )}
          </section>

          <CreateCriterionForm courseId={courseId} subjectId={subjectId} term={term} />

          {criteria.length === 0 ? (
            <EmptyState message="No hay criterios creados para esta materia y trimestre." />
          ) : (
            <div className="space-y-3">
              {criteria.map((criterion) => (
                <CriterionEditor key={criterion.id} criterion={criterion} />
              ))}
            </div>
          )}

          <Link
            href={gradebookHref}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Ir al cuaderno
          </Link>
        </>
      )}
    </section>
  );
}

function CreateCriterionForm({ courseId, subjectId, term }: { courseId: string; subjectId: string; term: GradeTerm }) {
  return (
    <form action={saveEvaluationCriterion} className="grid gap-3 rounded-lg border border-border bg-white p-5 lg:grid-cols-[1fr_130px_190px_160px]">
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="subject_id" value={subjectId} />
      <input type="hidden" name="term" value={term} />
      <input type="hidden" name="active" value="on" />
      <TextInput name="name" label="Nombre del criterio" placeholder="Proyecto final" />
      <TextInput name="weight" label="Peso %" type="number" step="0.01" placeholder="20" />
      <CriterionTypeSelect defaultValue="otro" />
      <Checkbox name="visible_to_family" label="Visible familia" defaultChecked />
      <button className="h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground lg:col-span-4">
        Crear criterio
      </button>
    </form>
  );
}

function CriterionEditor({ criterion }: { criterion: EvaluationCriterion }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <form action={saveEvaluationCriterion} className="grid gap-3 lg:grid-cols-[1fr_130px_190px_160px]">
        <input type="hidden" name="criterion_id" value={criterion.id} />
        <input type="hidden" name="course_id" value={criterion.course_id} />
        <input type="hidden" name="subject_id" value={criterion.subject_id} />
        <input type="hidden" name="term" value={criterion.term} />
        <input type="hidden" name="active" value={criterion.active ? "on" : ""} />
        <TextInput name="name" label="Nombre" defaultValue={criterion.name} />
        <TextInput name="weight" label="Peso %" type="number" step="0.01" defaultValue={String(criterion.weight)} />
        <CriterionTypeSelect defaultValue={criterion.criterion_type} />
        <Checkbox name="visible_to_family" label="Visible familia" defaultChecked={criterion.visible_to_family} />
        <button className="h-10 rounded-md border border-border bg-white px-3 text-sm font-semibold text-foreground transition hover:bg-muted lg:col-span-4">
          Guardar cambios
        </button>
      </form>
      <form action={deleteEvaluationCriterion} className="mt-3">
        <input type="hidden" name="criterion_id" value={criterion.id} />
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Eliminar criterio
        </button>
      </form>
    </article>
  );
}

function StatusBadge({ total }: { total: number }) {
  return (
    <span className={`w-fit rounded-md px-3 py-2 text-sm font-semibold ${total === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      Total: {total}%
    </span>
  );
}

function TextInput({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  step
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function CriterionTypeSelect({ defaultValue }: { defaultValue: CriterionType }) {
  const options: { value: CriterionType; label: string }[] = [
    { value: "parcial", label: "Parcial" },
    { value: "trimestral", label: "Trimestral" },
    { value: "comportamiento", label: "Comportamiento" },
    { value: "libreta", label: "Libreta" },
    { value: "oral", label: "Oral" },
    { value: "proyecto", label: "Proyecto" },
    { value: "actitud", label: "Actitud" },
    { value: "otro", label: "Otro" }
  ];

  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">Tipo opcional</span>
      <select
        name="criterion_type"
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked = false
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 pt-6 text-sm font-medium text-foreground">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function normalizeTerm(value: unknown): GradeTerm {
  return value === "2" || value === "3" ? value : "1";
}
