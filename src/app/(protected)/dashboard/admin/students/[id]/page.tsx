import Link from "next/link";
import { ArrowLeft, ClipboardList, GraduationCap, Settings } from "lucide-react";

import { getAttendanceLabel, type AttendanceRecord } from "@/lib/attendance/attendance";
import { requireRole } from "@/lib/auth/session";
import type { DirectorCommunication } from "@/lib/communications/notifications";
import { getDirectorStudentDetail } from "@/lib/director/students";
import {
  getGradesForStudent,
  getTermSubjectGradesForStudent,
  type GradeTerm,
  type GradeWithLabels,
  type TermSubjectGradeWithLabels
} from "@/lib/grades/grades";
import type { StudentIncident, StudentObservation } from "@/lib/tutors/students";
import { GradebookCard } from "@/components/grades/gradebook-design";
import { ReadonlyStudentObservations } from "@/components/students/readonly-student-observations";
import {
  StudentActivityTimeline,
  StudentProfileHeader,
  StudentProfileTabs,
  StudentQuickActions,
  StudentStatusDashboard,
  type StudentActivityItem
} from "@/components/students/student-profile";

type AdminStudentTab = "resumen" | "observaciones";

type AdminStudentDetailPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    tab?: string;
  };
};

const terms: GradeTerm[] = ["1", "2", "3"];
const tabs: Array<{ id: AdminStudentTab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "observaciones", label: "Observaciones internas" }
];

export default async function AdminStudentDetailPage({ params, searchParams }: AdminStudentDetailPageProps) {
  await requireRole("superadmin");

  const activeTab = normalizeTab(searchParams?.tab);
  const [
    { student, attendance, incidents, observations, communications, errorMessage },
    { grades, errorMessage: gradesErrorMessage },
    { termGrades, errorMessage: termGradesErrorMessage }
  ] = await Promise.all([
    getDirectorStudentDetail(params.id),
    getGradesForStudent(params.id),
    getTermSubjectGradesForStudent(params.id)
  ]);

  if (errorMessage && !student) {
    return (
      <section className="space-y-5">
        <BackLink />
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la ficha del alumno: {errorMessage}
        </div>
      </section>
    );
  }

  if (!student) {
    return (
      <section className="space-y-5">
        <BackLink />
        <GradebookCard className="p-6">
          <h1 className="text-xl font-semibold text-slate-950">Alumno no encontrado</h1>
        </GradebookCard>
      </section>
    );
  }

  const pageError = errorMessage ?? gradesErrorMessage ?? termGradesErrorMessage;

  return (
    <section className="space-y-5">
      <StudentProfileHeader
        backHref="/dashboard/admin/students"
        backLabel="← Volver a alumnos"
        studentName={`${student.name} ${student.last_name}`.trim()}
        courseName={student.courses?.name ?? student.course_id}
        tutorName="Gestión administrativa"
        active={student.active}
      />
      <StudentQuickActions
        title="Acciones de administración"
        description="Supervisa el alumno y accede a la gestión sin duplicar la ficha visual."
        actions={[
          { label: "Abrir cuaderno", href: `/dashboard/admin/gradebook?student_id=${params.id}`, icon: GraduationCap, primary: true },
          { label: "Ver observaciones", href: tabHref(params.id, "observaciones"), icon: ClipboardList },
          { label: "Gestión de alumnos", href: "/dashboard/admin/students", icon: Settings }
        ]}
      />

      {pageError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Algunos datos de supervisión no se pudieron cargar: {pageError}
        </div>
      ) : null}

      <StudentProfileTabs activeTab={activeTab} tabs={tabs.map((tab) => ({ ...tab, href: tabHref(params.id, tab.id) }))} />

      {activeTab === "resumen" ? (
        <SummaryTab
          attendance={attendance}
          incidents={incidents}
          observations={observations}
          communications={communications}
          grades={grades}
          termGrades={termGrades}
        />
      ) : null}

      {activeTab === "observaciones" ? <ReadonlyStudentObservations observations={observations} errorMessage={errorMessage} /> : null}
    </section>
  );
}

function SummaryTab({
  attendance,
  incidents,
  observations,
  communications,
  grades,
  termGrades
}: {
  attendance: AttendanceRecord[];
  incidents: StudentIncident[];
  observations: StudentObservation[];
  communications: DirectorCommunication[];
  grades: GradeWithLabels[];
  termGrades: TermSubjectGradeWithLabels[];
}) {
  const absences = attendance.filter((record) => record.status === "absent").length;
  const lates = attendance.filter((record) => record.status === "late").length;
  const recentAttendance = attendance.filter((record) => record.status === "absent" || record.status === "late").slice(0, 5);
  const latestItems = buildAdminLatestActivity({ incidents, observations, communications, grades, recentAttendance });
  const averageGrade = calculateAverageGrade(grades);
  const latestGrade = grades[0];
  const progress = calculateEvaluationProgress(termGrades, grades);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <StudentStatusDashboard
        averageGrade={averageGrade}
        latestGrade={latestGrade?.grade ?? null}
        latestGradeMeta={latestGrade ? `${latestGrade.subjectName} · ${latestGrade.assessment_name}` : "Sin registros"}
        progressCompleted={progress.completed}
        progressTotal={progress.total}
        progressPercent={progress.percent}
        attendanceValue={absences + lates === 0 ? "OK" : absences + lates}
        attendanceHint={`${absences} faltas · ${lates} retrasos`}
        attendanceTone={absences + lates > 0 ? "amber" : "green"}
        incidents={incidents.length}
        observations={observations.length}
        communications={communications.length}
      />
      <StudentActivityTimeline items={latestItems} empty="Sin movimientos registrados durante los últimos 30 días." />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/admin/students"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver a alumnos
    </Link>
  );
}

function normalizeTab(tab?: string): AdminStudentTab {
  return tabs.some((item) => item.id === tab) ? (tab as AdminStudentTab) : "resumen";
}

function tabHref(studentId: string, tab: AdminStudentTab) {
  const params = new URLSearchParams({ tab });
  return `/dashboard/admin/students/${studentId}?${params.toString()}`;
}

function calculateAverageGrade(grades: GradeWithLabels[]) {
  if (grades.length === 0) {
    return null;
  }

  const average = grades.reduce((total, grade) => total + Number(grade.grade), 0) / grades.length;
  return Number.isInteger(average) ? String(average) : average.toFixed(2);
}

function calculateEvaluationProgress(termGrades: TermSubjectGradeWithLabels[], grades: GradeWithLabels[]) {
  const subjectIds = new Set<string>([
    ...grades.map((grade) => grade.subject_id),
    ...termGrades.map((grade) => grade.subject_id)
  ]);
  const total = subjectIds.size > 0 ? subjectIds.size * terms.length : 0;
  const completed = termGrades.filter((grade) => grade.status === "closed" || grade.final_grade !== null).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percent };
}

function buildAdminLatestActivity({
  incidents,
  observations,
  communications,
  grades,
  recentAttendance
}: {
  incidents: StudentIncident[];
  observations: StudentObservation[];
  communications: DirectorCommunication[];
  grades: GradeWithLabels[];
  recentAttendance: AttendanceRecord[];
}): StudentActivityItem[] {
  return [
    ...communications.slice(0, 2).map((communication) => ({
      id: `communication-${communication.id}`,
      title: communication.title,
      meta: `${communication.senderName ?? communication.sender_id} → ${communication.receiverName ?? communication.receiver_id}`,
      date: communication.created_at,
      tone: "blue" as const,
      kind: "communication" as const
    })),
    ...incidents.slice(0, 2).map((incident) => ({
      id: `incident-${incident.id}`,
      title: incident.type,
      meta: `Incidencia ${incident.severity}`,
      date: incident.created_at,
      tone: "amber" as const,
      kind: "incident" as const
    })),
    ...observations.slice(0, 2).map((observation) => ({
      id: `observation-${observation.id}`,
      title: observation.title,
      meta: `Observación interna · ${observation.priority}`,
      date: observation.created_at,
      tone: "green" as const,
      kind: "observation" as const
    })),
    ...recentAttendance.slice(0, 1).map((record) => ({
      id: `attendance-${record.id}`,
      title: getAttendanceLabel(record.status),
      meta: record.justified ? "Asistencia justificada" : "Asistencia pendiente",
      date: record.date,
      tone: "gray" as const,
      kind: "attendance" as const
    })),
    ...grades.slice(0, 1).map((grade) => ({
      id: `grade-${grade.id}`,
      title: `${grade.subjectName}: ${grade.grade}`,
      meta: grade.assessment_name,
      date: grade.created_at,
      tone: "blue" as const,
      kind: "grade" as const
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
}