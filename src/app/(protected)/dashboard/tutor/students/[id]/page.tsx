import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ExternalLink,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";

import { GradebookBadge, GradebookCard, GradebookCardHeader, StudentAvatar } from "@/components/grades/gradebook-design";
import { getAttendanceLabel, getStudentAttendanceSummary } from "@/lib/attendance/attendance";
import { requireRole } from "@/lib/auth/session";
import { getFamilyRecipientsForStudent, getTutorCommunications, type TutorCommunication } from "@/lib/communications/notifications";
import { getGradesForStudent, getTermSubjectGradesForStudent, type GradeTerm, type GradeWithLabels, type TermSubjectGradeWithLabels } from "@/lib/grades/grades";
import { getIncidentsForTutorStudent, getObservationsForStudent, getStudentForTutor, type StudentIncident, type StudentObservation } from "@/lib/tutors/students";
import { createFamilyNotification, createStudentIncident, createStudentObservation } from "./actions";
import { StudentActivityTimeline, StudentProfileHeader, StudentProfileTabs, StudentQuickActions, StudentStatusDashboard } from "@/components/students/student-profile";

type TutorStudentDetailPageProps = {
  params: { id: string };
  searchParams?: {
    tab?: StudentTab;
    action?: StudentAction;
    subject_id?: string;
    term?: string;
    assessment?: string;
  };
};

type StudentTab = "resumen" | "calificaciones" | "asistencia" | "comunicacion" | "incidencias" | "observaciones";
type StudentAction = "communication" | "incident" | "observation";
type PageSearchParams = NonNullable<TutorStudentDetailPageProps["searchParams"]>;

const terms: GradeTerm[] = ["1", "2", "3"];
const tabs: Array<{ id: StudentTab; label: string; icon: LucideIcon }> = [
  { id: "resumen", label: "Resumen", icon: ShieldCheck },
  { id: "calificaciones", label: "Calificaciones", icon: BookOpenCheck },
  { id: "asistencia", label: "Asistencia", icon: CalendarDays },
  { id: "comunicacion", label: "Comunicación", icon: Bell },
  { id: "incidencias", label: "Incidencias", icon: AlertCircle },
  { id: "observaciones", label: "Observaciones", icon: MessageSquarePlus },
];

export default async function TutorStudentDetailPage({ params, searchParams = {} }: TutorStudentDetailPageProps) {
  const profile = await requireRole("tutor");
  const { student, errorMessage } = await getStudentForTutor(params.id, profile.id);

  if (errorMessage) {
    return <section className="space-y-6"><BackLink /><ErrorBox message={`No se pudo cargar la ficha del alumno: ${errorMessage}`} /></section>;
  }

  if (!student) {
    return (
      <section className="space-y-6">
        <BackLink />
        <GradebookCard className="p-6">
          <h1 className="text-xl font-semibold text-slate-950">No tienes acceso a este alumno</h1>
          <p className="mt-2 text-sm text-slate-500">La ficha solicitada no pertenece a tu tutoría o no existe.</p>
        </GradebookCard>
      </section>
    );
  }

  const [
    { incidents, errorMessage: incidentsErrorMessage },
    { recipients, errorMessage: recipientsErrorMessage },
    { summary: attendanceSummary, errorMessage: attendanceErrorMessage },
    { observations, errorMessage: observationsErrorMessage },
    { grades, errorMessage: gradesErrorMessage },
    { termGrades, errorMessage: termGradesErrorMessage },
    { communications, errorMessage: communicationsErrorMessage },
  ] = await Promise.all([
    getIncidentsForTutorStudent(student.id, profile.id),
    getFamilyRecipientsForStudent(student.id),
    getStudentAttendanceSummary(student.id, profile.id),
    getObservationsForStudent(student.id),
    getGradesForStudent(student.id),
    getTermSubjectGradesForStudent(student.id),
    getTutorCommunications(profile.id, { studentId: student.id }),
  ]);

  const currentTab = isStudentTab(searchParams.tab) ? searchParams.tab : "resumen";
  const currentAction = isStudentAction(searchParams.action) ? searchParams.action : null;
  const studentName = `${student.name} ${student.last_name}`.trim();
  const tutorName = profile.full_name ?? profile.email ?? profile.id;
  const subjectOptions = buildSubjectOptions(grades, termGrades);
  const filteredGrades = grades.filter((grade) => {
    if (searchParams.subject_id && grade.subject_id !== searchParams.subject_id) return false;
    if (searchParams.term && grade.term !== searchParams.term) return false;
    if (searchParams.assessment && grade.assessment_name !== searchParams.assessment) return false;
    return true;
  });
  const filteredTermGrades = termGrades.filter((grade) => {
    if (searchParams.subject_id && grade.subject_id !== searchParams.subject_id) return false;
    if (searchParams.term && grade.term !== searchParams.term) return false;
    return true;
  });
  const gradeGroups = buildGradeGroups(filteredGrades, filteredTermGrades);
  const recentAttendance = attendanceSummary.history.filter((record) => record.status !== "present").slice(0, 5);
  const pageError = incidentsErrorMessage ?? attendanceErrorMessage ?? observationsErrorMessage ?? gradesErrorMessage ?? termGradesErrorMessage ?? communicationsErrorMessage;

  return (
    <section className="space-y-5">
      <StudentProfileHeader backHref="/dashboard/tutor/students" backLabel="← Volver a Mis alumnos" studentName={studentName} courseName={student.courses?.name ?? student.course_id} tutorName={tutorName} active={student.active} />
      <StudentQuickActions actions={buildQuickActions(student.id, student.course_id, currentTab)} />
      {currentAction ? <ActionPanel action={currentAction} studentId={student.id} recipients={recipients} recipientsErrorMessage={recipientsErrorMessage} currentTab={currentTab} /> : null}
      {pageError ? <ErrorBox message={`Parte de la ficha no se pudo cargar: ${pageError}`} /> : null}
      <StudentProfileTabs activeTab={currentTab} tabs={tabs.map((tab) => ({ ...tab, href: buildStudentHref(student.id, { tab: tab.id, action: undefined }) }))} />
      {currentTab === "resumen" ? <SummaryTab attendanceSummary={attendanceSummary} recentAttendance={recentAttendance} incidents={incidents} observations={observations} communications={communications} grades={grades} termGrades={termGrades} /> : null}
      {currentTab === "calificaciones" ? <GradesTab studentId={student.id} courseId={student.course_id} subjectOptions={subjectOptions} grades={grades} gradeGroups={gradeGroups} searchParams={searchParams} errorMessage={gradesErrorMessage ?? termGradesErrorMessage} /> : null}
      {currentTab === "asistencia" ? <AttendanceTab recentAttendance={recentAttendance} history={attendanceSummary.history} /> : null}
      {currentTab === "comunicacion" ? <CommunicationTab studentId={student.id} communications={communications} recipients={recipients} recipientsErrorMessage={recipientsErrorMessage} /> : null}
      {currentTab === "incidencias" ? <IncidentsTab incidents={incidents} /> : null}
      {currentTab === "observaciones" ? <ObservationsTab observations={observations} errorMessage={observationsErrorMessage} /> : null}
    </section>
  );
}

function StudentHeader({ studentName, courseName, tutorName, active }: { studentName: string; courseName: string; tutorName: string; active: boolean }) {
  return (
    <GradebookCard className="p-4">
      <div className="flex min-w-0 items-start gap-4">
        <StudentAvatar name={studentName} />
        <div className="min-w-0">
          <BackLink />
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

function QuickActions({ studentId, courseId, currentTab }: { studentId: string; courseId: string; currentTab: StudentTab }) {
  const actions = [
    { label: "Comunicar", href: buildStudentHref(studentId, { tab: currentTab, action: "communication" }), icon: Bell, primary: true },
    { label: "Añadir incidencia", href: buildStudentHref(studentId, { tab: currentTab, action: "incident" }), icon: AlertCircle },
    { label: "Añadir observación", href: buildStudentHref(studentId, { tab: currentTab, action: "observation" }), icon: MessageSquarePlus },
    { label: "Abrir cuaderno", href: `/dashboard/tutor/gradebook?course_id=${courseId}`, icon: BookOpenCheck },
  ];

  return (
    <GradebookCard className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">Acciones rápidas</p>
          <p className="mt-1 text-xs text-slate-500">Actúa sobre el alumno sin mezclar formularios con el resumen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href} className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus:ring-4 ${action.primary ? "bg-sky-700 text-white shadow-sm hover:bg-sky-800 focus:ring-sky-100" : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-slate-100"}`}>
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

function ActionPanel({ action, studentId, recipients, recipientsErrorMessage, currentTab }: { action: StudentAction; studentId: string; recipients: { parent_id: string }[]; recipientsErrorMessage: string | null; currentTab: StudentTab }) {
  const title = action === "communication" ? "Enviar comunicación" : action === "incident" ? "Añadir incidencia" : "Añadir observación interna";
  const Icon = action === "communication" ? Bell : action === "incident" ? AlertCircle : MessageSquarePlus;

  return (
    <div id="accion">
      <GradebookCard className="p-5">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">Formulario abierto bajo demanda desde acciones rápidas.</p>
            </div>
          </div>
          <Link href={buildStudentHref(studentId, { tab: currentTab, action: undefined })} className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Cerrar
          </Link>
        </div>
        <div className="mt-4 max-w-2xl">
          {action === "communication" ? <CommunicationForm studentId={studentId} recipients={recipients} recipientsErrorMessage={recipientsErrorMessage} /> : null}
          {action === "incident" ? <IncidentForm studentId={studentId} /> : null}
          {action === "observation" ? <ObservationForm studentId={studentId} /> : null}
        </div>
      </GradebookCard>
    </div>
  );
}

function StudentTabs({ studentId, currentTab }: { studentId: string; currentTab: StudentTab }) {
  return (
    <GradebookCard className="p-2">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones de la ficha">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return <Link key={tab.id} href={buildStudentHref(studentId, { tab: tab.id, action: undefined })} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className="h-4 w-4" />{tab.label}</Link>;
        })}
      </nav>
    </GradebookCard>
  );
}

function SummaryTab({ attendanceSummary, recentAttendance, incidents, observations, communications, grades, termGrades }: { attendanceSummary: Awaited<ReturnType<typeof getStudentAttendanceSummary>>["summary"]; recentAttendance: Awaited<ReturnType<typeof getStudentAttendanceSummary>>["summary"]["history"]; incidents: StudentIncident[]; observations: StudentObservation[]; communications: TutorCommunication[]; grades: GradeWithLabels[]; termGrades: TermSubjectGradeWithLabels[] }) {
  const latestItems = buildLatestActivity({ incidents, observations, communications, grades, recentAttendance });
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
        attendanceValue={attendanceSummary.absences + attendanceSummary.lates === 0 ? "OK" : attendanceSummary.absences + attendanceSummary.lates}
        attendanceHint={`${attendanceSummary.absences} faltas · ${attendanceSummary.lates} retrasos`}
        attendanceTone={attendanceSummary.absences + attendanceSummary.lates > 0 ? "amber" : "green"}
        incidents={incidents.length}
        observations={observations.length}
        communications={communications.length}
      />
      <StudentActivityTimeline items={latestItems} empty="Sin movimientos registrados durante los últimos 30 días." />
    </div>
  );
}

function buildQuickActions(studentId: string, courseId: string, currentTab: StudentTab) {
  return [
    { label: "Comunicar", href: buildStudentHref(studentId, { tab: currentTab, action: "communication" }), icon: Bell, primary: true },
    { label: "Añadir incidencia", href: buildStudentHref(studentId, { tab: currentTab, action: "incident" }), icon: AlertCircle },
    { label: "Añadir observación", href: buildStudentHref(studentId, { tab: currentTab, action: "observation" }), icon: MessageSquarePlus },
    { label: "Abrir cuaderno", href: `/dashboard/tutor/gradebook?course_id=${courseId}`, icon: BookOpenCheck },
  ];
}
function GradesTab({ studentId, courseId, subjectOptions, grades, gradeGroups, searchParams, errorMessage }: { studentId: string; courseId: string; subjectOptions: { id: string; name: string }[]; grades: GradeWithLabels[]; gradeGroups: SubjectGradeGroup[]; searchParams: PageSearchParams; errorMessage: string | null }) {
  return (
    <GradebookCard className="p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Evaluación</p><h2 className="text-lg font-bold text-slate-950">Calificaciones</h2><p className="mt-1 text-sm text-slate-500">Consulta filtrable. La introducción masiva se realiza desde el cuaderno.</p></div><Link href={`/dashboard/tutor/gradebook?course_id=${courseId}`} className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800">Abrir cuaderno<ExternalLink className="h-4 w-4" /></Link></div>
      <GradeFilters studentId={studentId} subjectOptions={subjectOptions} grades={grades} searchParams={searchParams} />
      <div className="p-5">{errorMessage ? <ErrorBox message={`No se pudieron cargar las calificaciones: ${errorMessage}`} /> : gradeGroups.length === 0 ? <EmptyBox text="No hay calificaciones para los filtros seleccionados." /> : <div className="space-y-4">{gradeGroups.map((subjectGroup) => <article key={subjectGroup.subjectId} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-950">{subjectGroup.subjectName}</h3><GradebookBadge tone="gray">{subjectGroup.terms.size} trimestres</GradebookBadge></div><div className="mt-3 grid gap-3 lg:grid-cols-3">{Array.from(subjectGroup.terms.values()).map((termGroup) => <GradeTermCard key={termGroup.term} termGroup={termGroup} />)}</div></article>)}</div>}</div>
    </GradebookCard>
  );
}

function AttendanceTab({ recentAttendance, history }: { recentAttendance: Awaited<ReturnType<typeof getStudentAttendanceSummary>>["summary"]["history"]; history: Awaited<ReturnType<typeof getStudentAttendanceSummary>>["summary"]["history"] }) {
  const visible = recentAttendance.length > 0 ? recentAttendance : history.slice(0, 8);
  return <GradebookCard><GradebookCardHeader title="Asistencia"><GradebookBadge tone="gray">{visible.length} registros</GradebookBadge></GradebookCardHeader><div className="p-5">{visible.length === 0 ? <EmptyBox text="No hay faltas ni retrasos recientes." /> : <CompactList items={visible.map((record) => ({ id: record.id, title: `${record.date} · ${getAttendanceLabel(record.status)}`, meta: record.justified ? "Justificado" : "Pendiente de justificar" }))} empty="Sin asistencia reciente." />}</div></GradebookCard>;
}

function CommunicationTab({ studentId, communications, recipients, recipientsErrorMessage }: { studentId: string; communications: TutorCommunication[]; recipients: { parent_id: string }[]; recipientsErrorMessage: string | null }) {
  return <GradebookCard><GradebookCardHeader title="Comunicación"><Link href={buildStudentHref(studentId, { tab: "comunicacion", action: "communication" })} className="inline-flex h-8 items-center rounded-lg bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800">Nueva comunicación</Link></GradebookCardHeader><div className="p-5">{recipientsErrorMessage ? <ErrorBox message={`No se pudo comprobar la familia asociada: ${recipientsErrorMessage}`} /> : recipients.length === 0 ? <EmptyBox text="Este alumno no tiene ninguna familia vinculada en parent_students. Vincula una familia desde Superadmin o revisa la importación masiva antes de enviar comunicaciones." /> : null}<CommunicationList communications={communications} /></div></GradebookCard>;
}

function IncidentsTab({ incidents }: { incidents: StudentIncident[] }) {
  return <GradebookCard><GradebookCardHeader title="Incidencias"><GradebookBadge tone={incidents.length ? "amber" : "green"}>{incidents.length}</GradebookBadge></GradebookCardHeader><div className="p-5"><IncidentList incidents={incidents} /></div></GradebookCard>;
}

function ObservationsTab({ observations, errorMessage }: { observations: StudentObservation[]; errorMessage: string | null }) {
  return <GradebookCard><GradebookCardHeader title="Observaciones internas"><GradebookBadge tone="blue">Privadas</GradebookBadge></GradebookCardHeader><div className="p-5">{errorMessage ? <ErrorBox message={`No se pudieron cargar las observaciones: ${errorMessage}`} /> : <ObservationList observations={observations} />}</div></GradebookCard>;
}

function CommunicationForm({ studentId, recipients, recipientsErrorMessage }: { studentId: string; recipients: { parent_id: string }[]; recipientsErrorMessage: string | null }) {
  if (recipientsErrorMessage) return <ErrorBox message={`No se pudo comprobar la familia asociada: ${recipientsErrorMessage}`} />;
  if (recipients.length === 0) return <EmptyBox text="Este alumno no tiene ninguna familia vinculada en parent_students. Vincula una familia desde Superadmin o revisa la importación masiva antes de enviar comunicaciones." />;
  return <form action={createFamilyNotification} className="space-y-3"><input type="hidden" name="student_id" value={studentId} /><Input name="title" label="Título" required /><Select name="category" value="general" emptyLabel={null} options={[{ value: "incidencia", label: "Incidencia" }, { value: "académico", label: "Académico" }, { value: "tutoría", label: "Tutoría" }, { value: "general", label: "General" }]} /><Textarea name="message" label="Mensaje" required rows={4} /><Submit label="Enviar comunicación" icon={Bell} /></form>;
}

function IncidentForm({ studentId }: { studentId: string }) {
  return <form action={createStudentIncident} className="space-y-3"><input type="hidden" name="student_id" value={studentId} /><Input name="type" label="Tipo" placeholder="Conducta, material, convivencia..." required /><Select name="severity" value="media" emptyLabel={null} options={[{ value: "leve", label: "Leve" }, { value: "media", label: "Media" }, { value: "grave", label: "Grave" }]} /><Textarea name="description" label="Descripción" required rows={4} /><Submit label="Guardar incidencia" icon={AlertCircle} /></form>;
}

function ObservationForm({ studentId }: { studentId: string }) {
  return <form action={createStudentObservation} className="space-y-3"><input type="hidden" name="student_id" value={studentId} /><Select name="type" value="académica" emptyLabel={null} options={[{ value: "académica", label: "Académica" }, { value: "conductual", label: "Conductual" }, { value: "emocional", label: "Emocional" }, { value: "familiar", label: "Familiar" }, { value: "adaptación", label: "Adaptación" }, { value: "reunión", label: "Reunión" }]} /><Select name="priority" value="media" emptyLabel={null} options={[{ value: "baja", label: "Baja" }, { value: "media", label: "Media" }, { value: "alta", label: "Alta" }]} /><Input name="title" label="Título" required /><Textarea name="content" label="Contenido" required rows={4} /><Submit label="Guardar observación" icon={MessageSquarePlus} /></form>;
}

function GradeFilters({ studentId, subjectOptions, grades, searchParams }: { studentId: string; subjectOptions: { id: string; name: string }[]; grades: GradeWithLabels[]; searchParams: PageSearchParams }) {
  const visibleAssessments = Array.from(new Set(grades.filter((grade) => !searchParams.subject_id || grade.subject_id === searchParams.subject_id).filter((grade) => !searchParams.term || grade.term === searchParams.term).map((grade) => grade.assessment_name))).sort((a, b) => a.localeCompare(b, "es"));
  return <form className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 md:grid-cols-4"><input type="hidden" name="tab" value="calificaciones" /><Select name="subject_id" value={searchParams.subject_id ?? ""} emptyLabel="Todas las materias" options={subjectOptions.map((subject) => ({ value: subject.id, label: subject.name }))} /><Select name="term" value={searchParams.term ?? ""} emptyLabel="Todos los trimestres" options={terms.map((term) => ({ value: term, label: `Trimestre ${term}` }))} /><Select name="assessment" value={searchParams.assessment ?? ""} emptyLabel="Todos los criterios/pruebas" options={visibleAssessments.map((assessment) => ({ value: assessment, label: assessment }))} /><div className="flex gap-2"><button className="h-11 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white">Filtrar</button><Link href={buildStudentHref(studentId, { tab: "calificaciones", action: undefined, subject_id: undefined, term: undefined, assessment: undefined })} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Limpiar</Link></div></form>;
}

function GradeTermCard({ termGroup }: { termGroup: GradeTermGroup }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-slate-950">Trimestre {termGroup.term}</h4>{termGroup.finalGrade ? <GradebookBadge tone="blue">Final {termGroup.finalGrade.final_grade ?? "-"}</GradebookBadge> : <GradebookBadge tone="gray">Sin cierre</GradebookBadge>}</div>{termGroup.finalGrade ? <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500"><p>Calculada: {termGroup.finalGrade.calculated_grade ?? "Pendiente"}</p>{termGroup.finalGrade.final_observation ? <p className="mt-1">{termGroup.finalGrade.final_observation}</p> : null}</div> : null}<div className="mt-3 space-y-2">{termGroup.grades.length === 0 ? <p className="text-xs text-slate-500">No hay pruebas para este trimestre.</p> : termGroup.grades.map((grade) => <article key={grade.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{grade.assessment_name}</p><p className="text-xs text-slate-500">{grade.assessment_type} {grade.assessment_date ? `· ${formatDate(grade.assessment_date)}` : ""}</p></div><span className="rounded-lg bg-white px-2 py-1 text-sm font-semibold text-slate-950">{grade.grade}</span></div>{grade.comment ? <p className="mt-2 text-xs text-slate-500">Comentario: {grade.comment}</p> : null}{grade.recommendation ? <p className="mt-1 text-xs text-slate-500">Recomendación: {grade.recommendation}</p> : null}</article>)}</div></div>;
}

type SubjectGradeGroup = { subjectId: string; subjectName: string; terms: Map<GradeTerm, GradeTermGroup> };
type GradeTermGroup = { term: GradeTerm; grades: GradeWithLabels[]; finalGrade: TermSubjectGradeWithLabels | null };

function buildGradeGroups(grades: GradeWithLabels[], termGrades: TermSubjectGradeWithLabels[]) {
  const groups = new Map<string, SubjectGradeGroup>();
  function ensure(subjectId: string, subjectName: string, term: GradeTerm) {
    let subjectGroup = groups.get(subjectId);
    if (!subjectGroup) { subjectGroup = { subjectId, subjectName, terms: new Map() }; groups.set(subjectId, subjectGroup); }
    let termGroup = subjectGroup.terms.get(term);
    if (!termGroup) { termGroup = { term, grades: [], finalGrade: null }; subjectGroup.terms.set(term, termGroup); }
    return termGroup;
  }
  grades.forEach((grade) => { ensure(grade.subject_id, grade.subjectName, grade.term).grades.push(grade); });
  termGrades.forEach((grade) => { ensure(grade.subject_id, grade.subjectName, grade.term).finalGrade = grade; });
  return Array.from(groups.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es"));
}

function buildSubjectOptions(grades: GradeWithLabels[], termGrades: TermSubjectGradeWithLabels[]) {
  const entries: [string, string][] = [...grades.map((grade): [string, string] => [grade.subject_id, grade.subjectName]), ...termGrades.map((grade): [string, string] => [grade.subject_id, grade.subjectName])];
  return Array.from(new Map(entries).entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "es"));
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
    ...termGrades.map((grade) => grade.subject_id),
  ]);
  const total = subjectIds.size > 0 ? subjectIds.size * terms.length : 0;
  const completed = termGrades.filter((grade) => grade.status === "closed" || grade.final_grade !== null).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    total,
    percent,
  };
}
function buildLatestActivity({ incidents, observations, communications, grades, recentAttendance }: { incidents: StudentIncident[]; observations: StudentObservation[]; communications: TutorCommunication[]; grades: GradeWithLabels[]; recentAttendance: Awaited<ReturnType<typeof getStudentAttendanceSummary>>["summary"]["history"] }) {
  return [
    ...communications.slice(0, 2).map((communication) => ({ id: `communication-${communication.id}`, title: communication.title, meta: `${communication.direction === "sent" ? "Comunicación enviada" : "Comunicación recibida"} · ${communication.counterpartName}`, date: communication.created_at, tone: "blue" as const, kind: "communication" as const })),
    ...incidents.slice(0, 2).map((incident) => ({ id: `incident-${incident.id}`, title: incident.type, meta: `Incidencia ${incident.severity}`, date: incident.created_at, tone: "amber" as const, kind: "incident" as const })),
    ...observations.slice(0, 2).map((observation) => ({ id: `observation-${observation.id}`, title: observation.title, meta: `Observación interna · ${observation.priority}`, date: observation.created_at, tone: "green" as const, kind: "observation" as const })),
    ...recentAttendance.slice(0, 1).map((record) => ({ id: `attendance-${record.id}`, title: getAttendanceLabel(record.status), meta: record.justified ? "Asistencia justificada" : "Asistencia pendiente", date: record.date, tone: "gray" as const, kind: "attendance" as const })),
    ...grades.slice(0, 1).map((grade) => ({ id: `grade-${grade.id}`, title: `${grade.subjectName}: ${grade.grade}`, meta: grade.assessment_name, date: grade.created_at, tone: "blue" as const, kind: "grade" as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
}
function BackLink() {
  return <Link href="/dashboard/tutor/students" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Volver a Mis alumnos</Link>;
}


function StatusTile({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: "green" | "amber" | "blue" }) {
  const toneClass = { green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", blue: "bg-sky-50 text-sky-700" }[tone];
  return <div className="bg-white p-4"><span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass} text-sm font-bold`}>{value}</span><p className="mt-3 text-sm font-semibold text-slate-950">{label}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p></div>;
}

function CompactList({ items, empty }: { items: { id: string; title: string; meta: string }[]; empty: string }) {
  if (items.length === 0) return <EmptyBox text={empty} />;
  return <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">{items.map((item) => <div key={item.id} className="px-4 py-3"><p className="text-sm font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.meta}</p></div>)}</div>;
}

function Timeline({ items, empty }: { items: Array<{ id: string; title: string; meta: string; date: string; tone: "blue" | "green" | "amber" | "gray"; kind: "communication" | "incident" | "observation" | "attendance" | "grade" }>; empty: string }) {
  if (items.length === 0) return <div className="p-4"><EmptyBox text={empty} /></div>;
  const toneClass = { blue: "text-sky-700 bg-sky-50 ring-sky-100", green: "text-emerald-700 bg-emerald-50 ring-emerald-100", amber: "text-amber-700 bg-amber-50 ring-amber-100", gray: "text-slate-600 bg-slate-50 ring-slate-100" };
  const iconByKind = { communication: Bell, incident: AlertCircle, observation: MessageSquarePlus, attendance: CalendarDays, grade: BookOpenCheck };
  return <div className="p-4"><ol className="relative space-y-3 border-l border-slate-200 pl-6">{items.map((item) => { const Icon = iconByKind[item.kind]; return <li key={item.id} className="relative"><span className={`absolute -left-[34px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-1 ${toneClass[item.tone]}`}><Icon className="h-3.5 w-3.5" /></span><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.meta}</p></div><span className="shrink-0 text-xs text-slate-400">{formatDate(item.date)}</span></div></li>; })}</ol></div>;
}

function IncidentList({ incidents }: { incidents: StudentIncident[] }) {
  if (incidents.length === 0) return <EmptyBox text="No hay incidencias recientes." />;
  return <CompactList items={incidents.map((incident) => ({ id: incident.id, title: incident.type, meta: `${incident.severity} · ${formatDate(incident.created_at)}` }))} empty="No hay incidencias recientes." />;
}

function CommunicationList({ communications }: { communications: TutorCommunication[] }) {
  if (communications.length === 0) return <EmptyBox text="No hay comunicaciones recientes." />;
  return <CompactList items={communications.map((communication) => ({ id: communication.id, title: communication.title, meta: `${communication.direction === "sent" ? "Enviada" : "Recibida"} · ${communication.counterpartName}` }))} empty="No hay comunicaciones recientes." />;
}

function ObservationList({ observations }: { observations: StudentObservation[] }) {
  if (observations.length === 0) return <EmptyBox text="No hay observaciones internas recientes." />;
  return <div className="grid gap-3 lg:grid-cols-2">{observations.map((observation) => <article key={observation.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-950">{observation.title}</h3><GradebookBadge tone={observation.priority === "alta" ? "red" : observation.priority === "media" ? "amber" : "green"}>{observation.priority}</GradebookBadge></div><p className="mt-2 line-clamp-3 text-sm text-slate-500">{observation.content}</p><p className="mt-3 text-xs text-slate-400">{observation.type} · {formatDate(observation.created_at)}</p></article>)}</div>;
}

function Input({ name, label, required = false, placeholder }: { name: string; label: string; required?: boolean; placeholder?: string }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">{label}</span><input name={name} required={required} placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>;
}

function Textarea({ name, label, required = false, rows = 3 }: { name: string; label: string; required?: boolean; rows?: number }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">{label}</span><textarea name={name} required={required} rows={rows} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>;
}

function Select({ name, value, options, emptyLabel }: { name: string; value: string; options: { value: string; label: string }[]; emptyLabel: string | null }) {
  return <select name={name} defaultValue={value} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100">{emptyLabel ? <option value="">{emptyLabel}</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

function Submit({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800"><Icon className="h-4 w-4" />{label}</button>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{text}</div>;
}

function buildStudentHref(studentId: string, updates: Partial<PageSearchParams>) {
  const params = new URLSearchParams();
  Object.entries(updates).forEach(([key, value]) => { if (value) params.set(key, value); });
  const query = params.toString();
  return query ? `/dashboard/tutor/students/${studentId}?${query}` : `/dashboard/tutor/students/${studentId}`;
}

function isStudentTab(value: string | undefined): value is StudentTab {
  return Boolean(value && tabs.some((tab) => tab.id === value));
}

function isStudentAction(value: string | undefined): value is StudentAction {
  return value === "communication" || value === "incident" || value === "observation";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}





