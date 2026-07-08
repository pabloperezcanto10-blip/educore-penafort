import Link from "next/link";
import { Archive, ClipboardCheck, Download, Eye, FileSpreadsheet, FolderOpen, Landmark } from "lucide-react";
import {
  GradebookBadge,
  GradebookCard,
  GradebookCardHeader,
  ProgressBar,
  ProgressRing,
  StudentAvatar
} from "@/components/grades/gradebook-design";
import {
  getGradebookStatusLabel,
  getGradebookStatusTone,
  type GradebookStudentStatus
} from "@/components/grades/gradebook-status";
import type {
  EvaluationCriterionWithLabels,
  GradeTerm,
  GradeWithLabels,
  TermPublicationSummary,
  TermSubjectReportRow
} from "@/lib/grades/grades";

export type GradebookSupervisionStudentGroup = {
  studentId: string;
  studentName: string;
  reports: TermSubjectReportRow[];
  grades: GradeWithLabels[];
};

export function GradebookSupervisionSummary({
  summary,
  publicationPublished
}: {
  summary: TermPublicationSummary;
  publicationPublished: boolean;
}) {
  const totalSubjects = summary.closedSubjects + summary.pendingSubjects;
  const closureProgress = totalSubjects > 0 ? Math.round((summary.closedSubjects / totalSubjects) * 100) : 0;

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <GradebookCard className="p-6">
        <p className="text-lg font-semibold text-slate-900">Estado de la evaluación</p>
        <div className="mt-3 flex items-center gap-6">
          <ProgressRing value={closureProgress} />
          <div>
            <div className="text-[28px] font-bold leading-none text-slate-900">
              {summary.closedSubjects} / {totalSubjects}
            </div>
            <div className="mt-1 text-[13px] text-slate-500">materias cerradas</div>
            <div className="mt-2">
              <GradebookBadge tone={publicationPublished ? "green" : "amber"}>
                {publicationPublished ? "Publicada" : "Pendiente de publicar"}
              </GradebookBadge>
            </div>
          </div>
        </div>
      </GradebookCard>

      <GradebookCard className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-slate-900">Resumen de supervisión</p>
          <GradebookBadge tone={summary.pendingSubjects > 0 || summary.incompleteStudents > 0 ? "amber" : "green"}>
            {summary.pendingSubjects > 0 || summary.incompleteStudents > 0 ? "Con pendientes" : "Completo"}
          </GradebookBadge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Materias cerradas" value={summary.closedSubjects} tone="green" />
          <SummaryMetric label="Materias pendientes" value={summary.pendingSubjects} tone={summary.pendingSubjects > 0 ? "amber" : "slate"} />
          <SummaryMetric label="Alumnos completos" value={summary.completeStudents} tone="green" />
          <SummaryMetric label="Alumnos incompletos" value={summary.incompleteStudents} tone={summary.incompleteStudents > 0 ? "amber" : "slate"} />
        </div>
      </GradebookCard>
    </section>
  );
}

export function GradebookSupervisionStudentTable({
  courseName,
  groups,
  criteria = [],
  term,
  emptyText
}: {
  courseName: string;
  groups: GradebookSupervisionStudentGroup[];
  criteria?: EvaluationCriterionWithLabels[];
  term: GradeTerm;
  emptyText: string;
}) {
  if (groups.length === 0) {
    return (
      <GradebookCard className="border-dashed p-6 text-sm text-slate-500">
        {emptyText}
      </GradebookCard>
    );
  }

  return (
    <GradebookCard>
      <GradebookCardHeader title={`Alumnos (${groups.length})`}>
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500">
          {courseName}
        </span>
      </GradebookCardHeader>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Alumno</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Materias cerradas</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pendientes</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <SupervisionStudentRow key={group.studentId} group={group} criteria={criteria} term={term} />
            ))}
          </tbody>
        </table>
      </div>
    </GradebookCard>
  );
}

export function GradebookSupervisionItacaBlock() {
  const items = [
    { icon: FileSpreadsheet, title: "Plantilla ITACA", text: "Preparar datos para volcar notas en ITACA." },
    { icon: ClipboardCheck, title: "Actas de evaluación", text: "Generar acta de evaluación del curso." },
    { icon: FolderOpen, title: "Expedientes académicos", text: "Preparar expediente individual del alumnado." },
    { icon: Archive, title: "Cierre de curso", text: "Consolidar notas finales y preparar documentación." }
  ];

  return (
    <GradebookCard className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-800">
          <Landmark className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">ITACA / Actas / Expedientes</h2>
          <p className="mt-1 text-sm text-slate-500">Preparado para documentación oficial y exportaciones futuras.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Icon className="h-5 w-5 text-blue-800" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.text}</p>
              <span className="mt-4 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                Próximamente
              </span>
            </article>
          );
        })}
      </div>
    </GradebookCard>
  );
}

function SupervisionStudentRow({
  group,
  criteria,
  term
}: {
  group: GradebookSupervisionStudentGroup;
  criteria: EvaluationCriterionWithLabels[];
  term: GradeTerm;
}) {
  const closed = group.reports.filter((report) => report.status === "closed").length;
  const pending = group.reports.length - closed;
  const isComplete = group.reports.length > 0 && pending === 0;
  const status: GradebookStudentStatus = isComplete ? "completed" : closed > 0 ? "pending" : "ungraded";
  const progress = group.reports.length > 0 ? Math.round((closed / group.reports.length) * 100) : 0;
  const courseId = group.reports[0]?.course_id ?? "";
  const reportQuery = `student_id=${group.studentId}&term=${term}${courseId ? `&course_id=${courseId}` : ""}`;

  return (
    <tr className="border-b border-slate-200 transition last:border-b-0 hover:bg-slate-50 align-top">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <StudentAvatar name={group.studentName} />
          <div>
            <p className="text-[13px] font-semibold text-slate-900">{group.studentName}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-24">
                <ProgressBar value={progress} />
              </div>
              <span className="text-[11px] text-slate-500">{closed}/{group.reports.length}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{closed}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{pending}</td>
      <td className="px-4 py-3">
        <GradebookBadge tone={getGradebookStatusTone(status)}>{getGradebookStatusLabel(status)}</GradebookBadge>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/reports/term-preview?${reportQuery}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Vista previa
            </Link>
            <Link
              href={`/dashboard/reports/term-pdf?${reportQuery}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Descargar PDF
            </Link>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-blue-800">Ver materias</summary>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {group.reports.map((report) => (
                <SubjectClosureCard
                  key={`${report.student_id}-${report.subject_id}-${report.teacher_id}-${report.term}`}
                  report={report}
                  grades={group.grades.filter((grade) => grade.subject_id === report.subject_id)}
                  criteria={criteria.filter((criterion) => criterion.subject_id === report.subject_id)}
                />
              ))}
            </div>
          </details>
        </div>
      </td>
    </tr>
  );
}

function SubjectClosureCard({
  report,
  grades,
  criteria
}: {
  report: TermSubjectReportRow;
  grades: GradeWithLabels[];
  criteria: EvaluationCriterionWithLabels[];
}) {
  const criteriaByName = new Map(criteria.map((criterion) => [criterion.name, criterion]));

  return (
    <article className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{report.subjectName}</h3>
          <p className="mt-1 text-xs text-slate-500">{report.teacherName}</p>
        </div>
        <GradebookBadge tone={report.status === "closed" ? "green" : report.status === "draft" ? "amber" : "gray"}>
          {report.status === "closed" ? "Cerrada" : report.status === "draft" ? "Borrador" : "Pendiente"}
        </GradebookBadge>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <SmallStat label="Nota final" value={report.final_grade?.toString() ?? "-"} />
        <SmallStat label="Calculada" value={formatGrade(report.calculated_grade)} />
      </dl>
      <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        {report.final_observation ?? "Sin observación final"}
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-blue-800">
          Ver criterios y pruebas ({Math.max(criteria.length, grades.length)})
        </summary>
        <div className="mt-2 space-y-2">
          {grades.length === 0 ? (
            <p className="text-xs text-slate-500">Sin parciales registrados.</p>
          ) : (
            grades.map((grade) => {
              const criterion = criteriaByName.get(grade.assessment_name);

              return (
                <div key={grade.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-slate-900">{grade.assessment_name}</span>
                    <span className="font-semibold text-slate-900">{grade.grade}</span>
                  </div>
                  <p className="mt-1 text-slate-500">Peso: {criterion ? `${criterion.weight}%` : "No configurado"}</p>
                  {grade.comment ? <p className="mt-1 text-slate-500">Comentario: {grade.comment}</p> : null}
                  {grade.recommendation ? <p className="mt-1 text-slate-500">Recomendación: {grade.recommendation}</p> : null}
                </div>
              );
            })
          )}
        </div>
      </details>
    </article>
  );
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "slate" }) {
  const className =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`rounded-md border p-3 ${className}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function formatGrade(value: number | null) {
  return value === null ? "-" : Number(value).toFixed(2);
}
