import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarCheck, CheckCircle2, Clock3, FileText, UserCheck, UserMinus, Users } from "lucide-react";

import { GradebookBadge, GradebookCard, StudentAvatar } from "@/components/grades/gradebook-design";

export type AttendanceStatusKey = "present" | "absent" | "late" | "justified";

export type AttendanceSummaryCounts = {
  total: number;
  present: number;
  absent: number;
  late: number;
  justified: number;
  pending: number;
};

const statusTone: Record<AttendanceStatusKey, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-800 peer-checked:border-emerald-300 peer-checked:bg-emerald-100 peer-checked:ring-2 peer-checked:ring-emerald-100",
  absent: "border-red-200 bg-red-50 text-red-800 peer-checked:border-red-300 peer-checked:bg-red-100 peer-checked:ring-2 peer-checked:ring-red-100",
  late: "border-amber-200 bg-amber-50 text-amber-800 peer-checked:border-amber-300 peer-checked:bg-amber-100 peer-checked:ring-2 peer-checked:ring-amber-100",
  justified: "border-sky-200 bg-sky-50 text-sky-800 peer-checked:border-sky-300 peer-checked:bg-sky-100 peer-checked:ring-2 peer-checked:ring-sky-100"
};

const readOnlyStatusTone: Record<AttendanceStatusKey, "green" | "red" | "amber" | "blue"> = {
  present: "green",
  absent: "red",
  late: "amber",
  justified: "blue"
};

export function AttendancePageHeader({
  title = "Pasar lista",
  description,
  actions
}: {
  title?: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AttendanceLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

export function AttendanceSessionCard({
  course,
  subject,
  day,
  time,
  date,
  statusLabel
}: {
  course: string;
  subject: string;
  day: string;
  time: string;
  date: string;
  statusLabel: string;
}) {
  return (
    <GradebookCard className="p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">{course}</h2>
              <GradebookBadge tone="blue">{subject}</GradebookBadge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {day} · {time} · {date}
            </p>
          </div>
        </div>
        <GradebookBadge tone={statusLabel === "Asistencia registrada" ? "green" : "amber"}>{statusLabel}</GradebookBadge>
      </div>
    </GradebookCard>
  );
}

export function AttendanceSummary({ counts }: { counts: AttendanceSummaryCounts }) {
  const items: Array<{ label: string; value: number; icon: LucideIcon; tone: "blue" | "green" | "amber" | "red" | "gray" }> = [
    { label: "Total alumnos", value: counts.total, icon: Users, tone: "blue" },
    { label: "Presentes", value: counts.present, icon: UserCheck, tone: "green" },
    { label: "Ausentes", value: counts.absent, icon: UserMinus, tone: "red" },
    { label: "Retrasos", value: counts.late, icon: Clock3, tone: "amber" },
    { label: "Justificados", value: counts.justified, icon: CheckCircle2, tone: "blue" },
    { label: "Pendientes", value: counts.pending, icon: FileText, tone: counts.pending > 0 ? "amber" : "gray" }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <GradebookCard key={item.label} className="p-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${summaryToneClass(item.tone)}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xl font-bold leading-none text-slate-950">{item.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{item.label}</p>
              </div>
            </div>
          </GradebookCard>
        );
      })}
    </div>
  );
}

export function AttendanceStatusSelector({
  name,
  currentStatus,
  labels,
  statuses
}: {
  name: string;
  currentStatus: AttendanceStatusKey;
  labels: Record<AttendanceStatusKey, string>;
  statuses: AttendanceStatusKey[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Estado de asistencia">
      {statuses.map((status) => (
        <label key={status} className="relative">
          <input
            type="radio"
            name={name}
            value={status}
            defaultChecked={currentStatus === status}
            className="peer sr-only"
          />
          <span
            className={`inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-xs font-semibold transition ${statusTone[status]}`}
          >
            {labels[status]}
          </span>
        </label>
      ))}
    </div>
  );
}

export function AttendanceStudentRow({
  studentName,
  currentLabel,
  status,
  labels,
  statuses,
  statusInputName,
  notesInputName,
  notes,
  hiddenStudentInput,
  studentHref,
  readOnly = false
}: {
  studentName: string;
  currentLabel: string;
  status: AttendanceStatusKey;
  labels: Record<AttendanceStatusKey, string>;
  statuses: AttendanceStatusKey[];
  statusInputName?: string;
  notesInputName?: string;
  notes?: string | null;
  hiddenStudentInput?: ReactNode;
  studentHref?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,430px)_minmax(180px,280px)] lg:items-center">
      {hiddenStudentInput}
      <div className="flex min-w-0 items-center gap-3">
        <StudentAvatar name={studentName} />
        <div className="min-w-0">
          {studentHref ? (
            <Link href={studentHref} className="truncate text-sm font-semibold text-sky-800 transition hover:text-sky-950 hover:underline">
              {studentName}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-slate-950">{studentName}</p>
          )}
          <p className="mt-0.5 text-xs text-slate-500">Estado actual: {currentLabel}</p>
        </div>
      </div>

      {readOnly || !statusInputName ? (
        <div>
          <GradebookBadge tone={readOnlyStatusTone[status]}>{labels[status]}</GradebookBadge>
        </div>
      ) : (
        <AttendanceStatusSelector
          name={statusInputName}
          currentStatus={status}
          labels={labels}
          statuses={statuses}
        />
      )}

      {readOnly || !notesInputName ? (
        <p className="text-sm text-slate-500">{notes || "Sin notas"}</p>
      ) : (
        <input
          name={notesInputName}
          defaultValue={notes ?? ""}
          placeholder="Notas opcionales"
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
        />
      )}
    </div>
  );
}

export function AttendanceTableCard({
  title = "Alumnos",
  badge,
  children,
  footer
}: {
  title?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <GradebookCard>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <h2 className="flex-1 text-[15px] font-semibold text-slate-900">{title}</h2>
        {badge}
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
      {footer ? <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">{footer}</div> : null}
    </GradebookCard>
  );
}

export function AttendanceEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <GradebookCard className="p-6">
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </GradebookCard>
  );
}

export function AttendanceNotice({
  tone,
  children
}: {
  tone: "success" | "error" | "warning";
  children: ReactNode;
}) {
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800"
  }[tone];

  return <div className={`rounded-xl border p-4 text-sm ${toneClass}`}>{children}</div>;
}

function summaryToneClass(tone: "blue" | "green" | "amber" | "red" | "gray") {
  return {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-slate-50 text-slate-500"
  }[tone];
}
