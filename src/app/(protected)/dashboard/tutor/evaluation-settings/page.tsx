import Link from "next/link";
import { CheckCircle2, ChevronDown, Settings2, Trash2 } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { GradebookBadge, GradebookCard, GradebookCardHeader, ProgressBar } from "@/components/grades/gradebook-design";
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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Criterios de evaluación</h1>
          <p className="mt-1 text-sm text-slate-500">
            Prepara la estructura de cálculo antes de introducir notas en el cuaderno.
          </p>
        </div>
        <Link
          href="/dashboard/tutor"
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Volver al dashboard
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los criterios: {errorMessage}
        </div>
      ) : null}

      <EvaluationSettingsFilters courses={courses} subjects={subjects} courseId={courseId} subjectId={subjectId} term={term} />

      {!courseId ? (
        <EmptyState message="Selecciona un curso para configurar criterios." />
      ) : subjects.length === 0 ? (
        <EmptyState message="No hay materias asignadas para este curso." />
      ) : !subjectId ? (
        <EmptyState message="Selecciona una materia para configurar criterios." />
      ) : (
        <>
          <CriteriaSummary total={weightTotal} count={criteria.length} />
          <CreateCriterionForm courseId={courseId} subjectId={subjectId} term={term} />

          {criteria.length === 0 ? (
            <EmptyState message="No hay criterios creados para esta materia y trimestre." />
          ) : (
            <CriteriaList criteria={criteria} />
          )}

          <Link
            href={gradebookHref}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Ir al cuaderno
          </Link>
        </>
      )}
    </section>
  );
}

function CriteriaSummary({ total, count }: { total: number; count: number }) {
  const remaining = 100 - total;
  const exceeded = total > 100;
  const complete = total === 100;
  const progress = Math.min(Math.max(total, 0), 100);
  const tone = complete ? "green" : exceeded ? "red" : "amber";
  const statusLabel = complete ? "Completo" : exceeded ? "Excedido" : "Incompleto";

  return (
    <GradebookCard>
      <GradebookCardHeader title="Configuración activa">
        <GradebookBadge tone={tone}>{statusLabel}</GradebookBadge>
      </GradebookCardHeader>
      <div className="grid gap-4 p-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">Peso configurado</p>
              <p className="mt-1 text-sm text-slate-500">
                El cuaderno solo podrá cerrar trimestre cuando los criterios sumen exactamente 100%.
              </p>
            </div>
          </div>
          <ProgressBar value={progress} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SummaryMetric label="Total" value={`${total}%`} tone={tone} />
          <SummaryMetric label="Criterios" value={count} />
          <SummaryMetric label={exceeded ? "Exceso" : "Restante"} value={`${Math.abs(remaining)}%`} tone={complete ? "green" : tone} />
        </div>
      </div>
    </GradebookCard>
  );
}

function SummaryMetric({ label, value, tone = "blue" }: { label: string; value: string | number; tone?: "blue" | "green" | "amber" | "red" }) {
  const toneClass = {
    blue: "text-sky-700",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700"
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function CreateCriterionForm({ courseId, subjectId, term }: { courseId: string; subjectId: string; term: GradeTerm }) {
  return (
    <GradebookCard>
      <GradebookCardHeader title="Añadir criterio">
        <GradebookBadge tone="blue">Nuevo</GradebookBadge>
      </GradebookCardHeader>
      <form action={saveEvaluationCriterion} className="grid gap-3 p-4 lg:grid-cols-[1fr_120px_180px_150px_auto]">
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="subject_id" value={subjectId} />
        <input type="hidden" name="term" value={term} />
        <input type="hidden" name="active" value="on" />
        <TextInput name="name" label="Nombre" placeholder="Proyecto final" />
        <TextInput name="weight" label="Peso %" type="number" step="0.01" placeholder="20" />
        <CriterionTypeSelect defaultValue="otro" />
        <Checkbox name="visible_to_family" label="Visible familia" defaultChecked />
        <button className="h-10 rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800 lg:self-end">
          Crear criterio
        </button>
      </form>
    </GradebookCard>
  );
}

function CriteriaList({ criteria }: { criteria: EvaluationCriterion[] }) {
  return (
    <GradebookCard>
      <GradebookCardHeader title="Criterios configurados">
        <GradebookBadge tone="blue">{criteria.length} criterios</GradebookBadge>
      </GradebookCardHeader>
      <div className="divide-y divide-slate-200">
        {criteria.map((criterion) => (
          <CriterionRow key={criterion.id} criterion={criterion} />
        ))}
      </div>
    </GradebookCard>
  );
}

function CriterionRow({ criterion }: { criterion: EvaluationCriterion }) {
  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 transition hover:bg-slate-50 md:grid-cols-[1fr_100px_150px_140px_120px] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <ChevronDown className="h-4 w-4 shrink-0 text-sky-700 transition group-open:rotate-180" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{criterion.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">Editar para modificar nombre, peso, tipo o visibilidad.</p>
          </div>
        </div>
        <span className="text-sm font-bold text-sky-700">{criterion.weight}%</span>
        <GradebookBadge tone="gray">{formatCriterionType(criterion.criterion_type)}</GradebookBadge>
        <GradebookBadge tone={criterion.visible_to_family ? "green" : "gray"}>
          {criterion.visible_to_family ? "Visible familia" : "No visible"}
        </GradebookBadge>
        <span className="text-xs font-semibold text-sky-700">Editar</span>
      </summary>
      <div className="border-t border-slate-200 bg-slate-50 p-4">
        <CriterionEditor criterion={criterion} />
      </div>
    </details>
  );
}

function CriterionEditor({ criterion }: { criterion: EvaluationCriterion }) {
  return (
    <div className="space-y-3">
      <form action={saveEvaluationCriterion} className="grid gap-3 lg:grid-cols-[1fr_120px_180px_150px_auto]">
        <input type="hidden" name="criterion_id" value={criterion.id} />
        <input type="hidden" name="course_id" value={criterion.course_id} />
        <input type="hidden" name="subject_id" value={criterion.subject_id} />
        <input type="hidden" name="term" value={criterion.term} />
        <input type="hidden" name="active" value={criterion.active ? "on" : ""} />
        <TextInput name="name" label="Nombre" defaultValue={criterion.name} />
        <TextInput name="weight" label="Peso %" type="number" step="0.01" defaultValue={String(criterion.weight)} />
        <CriterionTypeSelect defaultValue={criterion.criterion_type} />
        <Checkbox name="visible_to_family" label="Visible familia" defaultChecked={criterion.visible_to_family} />
        <button className="h-10 rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800 lg:self-end">
          Guardar cambios
        </button>
      </form>
      <form action={deleteEvaluationCriterion}>
        <input type="hidden" name="criterion_id" value={criterion.id} />
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Eliminar criterio
        </button>
      </form>
    </div>
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
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
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
      <span className="text-xs font-semibold text-slate-500">Tipo</span>
      <select
        name="criterion_type"
        defaultValue={defaultValue}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
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
    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 lg:self-end">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
      {message}
    </div>
  );
}

function formatCriterionType(value: CriterionType) {
  const labels: Record<CriterionType, string> = {
    parcial: "Parcial",
    trimestral: "Trimestral",
    comportamiento: "Comportamiento",
    libreta: "Libreta",
    oral: "Oral",
    proyecto: "Proyecto",
    actitud: "Actitud",
    otro: "Otro"
  };

  return labels[value] ?? value;
}

function normalizeTerm(value: unknown): GradeTerm {
  return value === "2" || value === "3" ? value : "1";
}