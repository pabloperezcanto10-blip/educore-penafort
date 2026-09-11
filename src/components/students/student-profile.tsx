import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Bell, BookOpenCheck, CalendarDays, MessageSquarePlus } from "lucide-react";

import { GradebookBadge, GradebookCard, GradebookCardHeader, ProgressBar, StudentAvatar } from "@/components/grades/gradebook-design";
import type { StudentAttendanceSummary, StudentProfileAttendanceStatus } from "@/lib/attendance/attendance";
import { formatMadridDate } from "@/lib/date-time/madrid";

export type StudentProfileTabItem = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
};

export type StudentProfileActionItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
};

export type StudentActivityKind = "communication" | "incident" | "observation" | "attendance" | "grade";
export type StudentActivityTone = "blue" | "green" | "amber" | "gray";

export type StudentActivityItem = {
  id: string;
  title: string;
  meta: string;
  date: string;
  tone: StudentActivityTone;
  kind: StudentActivityKind;
};

export function StudentProfileHeader({
  backHref,
  backLabel,
  studentName,
  courseName,
  tutorName,
  active,
}: {
  backHref: string;
  backLabel: string;
  studentName: string;
  courseName: string;
  tutorName: string;
  active: boolean;
}) {
  return (
    <GradebookCard className="p-4">
      <div className="flex min-w-0 items-start gap-4">
        <StudentAvatar name={studentName} />
        <div className="min-w-0">
          <Link href={backHref} className="inline-flex text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            {backLabel}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{studentName}</h1>
            <GradebookBadge tone={active ? "green" : "gray"}>{active ? "Activo" : "Inactivo"}</GradebookBadge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{courseName} · Tutor: {tutorName}</p>
        </div>
      </div>
    </GradebookCard>
  );
}

export function StudentQuickActions({
  title = "Acciones rápidas",
  description = "Actúa sobre el alumno sin mezclar formularios con el resumen.",
  actions,
}: {
  title?: string;
  description?: string;
  actions: StudentProfileActionItem[];
}) {
  if (actions.length === 0) return null;

  return (
    <GradebookCard className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus:ring-4 ${
                  action.primary
                    ? "bg-sky-700 text-white shadow-sm hover:bg-sky-800 focus:ring-sky-100"
                    : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </GradebookCard>
  );
}

export function StudentProfileTabs({ tabs, activeTab }: { tabs: StudentProfileTabItem[]; activeTab: string }) {
  return (
    <GradebookCard className="p-2">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones de la ficha">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                active ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </GradebookCard>
  );
}

export function StudentStatusDashboard({
  averageGrade,
  latestGrade,
  latestGradeMeta,
  progressCompleted,
  progressTotal,
  progressPercent,
  attendanceValue,
  attendanceHint,
  attendanceTone,
  incidents,
  observations,
  communications,
}: {
  averageGrade: string | null;
  latestGrade: string | number | null;
  latestGradeMeta: string;
  progressCompleted: number;
  progressTotal: number;
  progressPercent: number;
  attendanceValue: string | number;
  attendanceHint: string;
  attendanceTone: "green" | "amber" | "blue";
  incidents: number;
  observations: number;
  communications: number;
}) {
  return (
    <GradebookCard>
      <GradebookCardHeader title="Estado del alumno" />
      <div className="space-y-4 p-4">
        <div className="grid gap-4 xl:grid-cols-[190px_210px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Nota media actual</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{averageGrade ?? "-"}</p>
            <p className="mt-1 text-xs text-slate-500">{averageGrade ? "Calculada con calificaciones reales" : "Sin calificaciones"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Última calificación</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{latestGrade ?? "-"}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{latestGrade ? latestGradeMeta : "Sin registros"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Progreso de evaluación</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{progressCompleted} de {progressTotal} cierres trimestrales</p>
              </div>
              <GradebookBadge tone={progressPercent === 100 ? "green" : progressPercent > 0 ? "amber" : "gray"}>{progressPercent}%</GradebookBadge>
            </div>
            <div className="mt-4"><ProgressBar value={progressPercent} /></div>
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
          <StatusTile label="Asistencia" value={attendanceValue} hint={attendanceHint} tone={attendanceTone} />
          <StatusTile label="Incidencias" value={incidents} hint="Registradas" tone={incidents > 0 ? "amber" : "green"} />
          <StatusTile label="Observaciones" value={observations} hint="Internas" tone="blue" />
          <StatusTile label="Comunicaciones" value={communications} hint="Relacionadas" tone="blue" />
        </div>
      </div>
    </GradebookCard>
  );
}

export function StudentActivityTimeline({ items, empty }: { items: StudentActivityItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <GradebookCard>
        <GradebookCardHeader title="Seguimiento reciente" />
        <div className="p-4">
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{empty}</div>
        </div>
      </GradebookCard>
    );
  }

  const toneClass = {
    blue: "text-sky-700 bg-sky-50 ring-sky-100",
    green: "text-emerald-700 bg-emerald-50 ring-emerald-100",
    amber: "text-amber-700 bg-amber-50 ring-amber-100",
    gray: "text-slate-600 bg-slate-50 ring-slate-100",
  } satisfies Record<StudentActivityTone, string>;
  const iconByKind = {
    communication: Bell,
    incident: AlertCircle,
    observation: MessageSquarePlus,
    attendance: CalendarDays,
    grade: BookOpenCheck,
  } satisfies Record<StudentActivityKind, LucideIcon>;

  return (
    <GradebookCard>
      <GradebookCardHeader title="Seguimiento reciente">
        <GradebookBadge tone="gray">Últimos movimientos</GradebookBadge>
      </GradebookCardHeader>
      <div className="p-4">
        <ol className="relative space-y-3 border-l border-slate-200 pl-6">
          {items.map((item) => {
            const Icon = iconByKind[item.kind];
            return (
              <li key={item.id} className="relative">
                <span className={`absolute -left-[34px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-1 ${toneClass[item.tone]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(item.date)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </GradebookCard>
  );
}

export function StudentAttendanceHistory({ summary }: { summary: StudentAttendanceSummary }) {
  const metrics = [
    { label: "Días", value: summary.days },
    { label: "Registros", value: summary.records },
    { label: "Presentes", value: summary.present },
    { label: "Ausencias", value: summary.absences },
    { label: "Retrasos", value: summary.lates },
    { label: "Justificados", value: summary.justified }
  ];

  return (
    <GradebookCard>
      <GradebookCardHeader title="Asistencia">
        <GradebookBadge tone="gray">{summary.records} registros</GradebookBadge>
      </GradebookCardHeader>
      <div className="space-y-4 p-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-white px-3 py-2.5">
              <dt className="text-[11px] font-medium text-slate-500">{metric.label}</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">{metric.value}</dd>
            </div>
          ))}
        </dl>

        {summary.history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No hay registros de asistencia en el curso académico activo.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summary.history.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      <time dateTime={record.attendance_date}>{formatMadridDate(record.attendance_date)}</time>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <GradebookBadge tone={attendanceTone(record.status)}>
                        {attendanceLabel(record.status)}
                      </GradebookBadge>
                    </td>
                    <td className="min-w-52 px-4 py-3 text-slate-500">{record.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </GradebookCard>
  );
}

function attendanceLabel(status: StudentProfileAttendanceStatus) {
  return {
    present: "Presente",
    absent: "Ausente",
    late: "Retraso",
    justified: "Justificado"
  }[status];
}

function attendanceTone(status: StudentProfileAttendanceStatus): "green" | "red" | "amber" | "blue" {
  const tones: Record<StudentProfileAttendanceStatus, "green" | "red" | "amber" | "blue"> = {
    present: "green",
    absent: "red",
    late: "amber",
    justified: "blue"
  };

  return tones[status];
}

function StatusTile({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: "green" | "amber" | "blue" }) {
  const toneClass = { green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", blue: "bg-sky-50 text-sky-700" }[tone];
  return <div className="bg-white p-4"><span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass} text-sm font-bold`}>{value}</span><p className="mt-3 text-sm font-semibold text-slate-950">{label}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}
