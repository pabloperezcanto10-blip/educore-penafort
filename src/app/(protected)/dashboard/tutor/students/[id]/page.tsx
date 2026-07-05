import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  GraduationCap,
  ListChecks,
  MessageSquarePlus,
  NotebookPen,
  Send,
  ShieldCheck,
  Users,
  Zap
} from "lucide-react";
import { getAttendanceLabel, getStudentAttendanceSummary } from "@/lib/attendance/attendance";
import { requireRole } from "@/lib/auth/session";
import {
  getFamilyRecipientsForStudent,
  getTutorCommunications,
  type TutorCommunication
} from "@/lib/communications/notifications";
import {
  getGradesForStudent,
  getTermSubjectGradesForStudent,
  type GradeTerm,
  type GradeWithLabels,
  type TermSubjectGradeWithLabels
} from "@/lib/grades/grades";
import {
  getIncidentsForTutorStudent,
  getObservationsForStudent,
  getStudentForTutor,
  type StudentIncident,
  type StudentObservation
} from "@/lib/tutors/students";
import { createFamilyNotification, createStudentIncident, createStudentObservation } from "./actions";

type TutorStudentDetailPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    subject_id?: string;
    term?: string;
    assessment?: string;
  };
};

const terms: GradeTerm[] = ["1", "2", "3"];

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
};

type StatusItem = {
  label: string;
  value: number;
  caption: string;
  icon: typeof Bell;
  tone: "green" | "amber" | "red" | "blue" | "purple" | "slate";
};

export default async function TutorStudentDetailPage({
  params,
  searchParams = {}
}: TutorStudentDetailPageProps) {
  const profile = await requireRole("tutor");
  const { student, errorMessage } = await getStudentForTutor(params.id, profile.id);

  if (errorMessage) {
    return (
      <section className="space-y-6">
        <BackLink />
        <ErrorBox message={`No se pudo cargar la ficha del alumno: ${errorMessage}`} />
      </section>
    );
  }

  if (!student) {
    return (
      <section className="space-y-6">
        <BackLink />
        <div className="rounded-lg border border-border bg-white p-6">
          <h1 className="text-xl font-semibold text-foreground">No tienes acceso a este alumno</h1>
          <p className="mt-2 text-sm text-muted-foreground">La ficha solicitada no pertenece a tu tutoría o no existe.</p>
        </div>
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
    { communications, errorMessage: communicationsErrorMessage }
  ] = await Promise.all([
    getIncidentsForTutorStudent(student.id, profile.id),
    getFamilyRecipientsForStudent(student.id),
    getStudentAttendanceSummary(student.id, profile.id),
    getObservationsForStudent(student.id),
    getGradesForStudent(student.id),
    getTermSubjectGradesForStudent(student.id),
    getTutorCommunications(profile.id, { studentId: student.id })
  ]);
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
  const pageError =
    incidentsErrorMessage ??
    attendanceErrorMessage ??
    observationsErrorMessage ??
    gradesErrorMessage ??
    termGradesErrorMessage ??
    communicationsErrorMessage;
  const latestActivityItems = [
    latestItem("communication", communications[0]?.id, "Comunicación", communications[0]?.title, communications[0] ? formatDate(communications[0].created_at) : null),
    latestItem("incident", incidents[0]?.id, "Incidencia", incidents[0]?.type, incidents[0] ? formatDate(incidents[0].created_at) : null),
    latestItem("observation", observations[0]?.id, "Observación", observations[0]?.title, observations[0] ? formatDate(observations[0].created_at) : null),
    latestItem("attendance", recentAttendance[0]?.id, "Asistencia", recentAttendance[0] ? getAttendanceLabel(recentAttendance[0].status) : undefined, recentAttendance[0]?.date ?? null),
    latestItem("grade", grades[0]?.id, "Nota", grades[0] ? `${grades[0].subjectName}: ${grades[0].grade}` : undefined, grades[0]?.assessment_date ? formatDate(grades[0].assessment_date) : null)
  ].filter((item): item is ActivityItem => Boolean(item));
  const pendingFollowUps = recentAttendance.filter((record) => !record.justified).length;

  return (
    <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-xl border border-border bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
        <BackLink />
        <div className="mt-6 flex flex-col items-center text-center">
          <StudentAvatar name={`${student.name} ${student.last_name}`} />
          <div className="mt-4 min-w-0">
            <h1 className="text-2xl font-semibold leading-tight text-foreground">
              {student.name} {student.last_name}
            </h1>
            <p className="mt-3 text-sm font-medium text-muted-foreground">{student.courses?.name ?? student.course_id}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tutor: {profile.full_name ?? profile.email ?? profile.id}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {student.active ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <nav className="mt-6 space-y-1 border-t border-border pt-4" aria-label="Navegación del alumno">
          <SidebarNavLink href="#resumen" icon={ShieldCheck} label="Resumen" active />
          <SidebarNavLink href="#actividad" icon={Bell} label="Actividad reciente" />
          <SidebarNavLink href="#academico" icon={BookOpenCheck} label="Información académica" />
          <SidebarNavLink href="#notas-tutor" icon={MessageSquarePlus} label="Notas privadas" />
          <SidebarNavLink href="#historial-completo" icon={ClipboardList} label="Historial completo" />
        </nav>
      </aside>

      <main className="space-y-4">
        <QuickActions studentId={student.id} courseId={student.course_id} />

        {pageError ? <ErrorBox message={`Parte de la ficha no se pudo cargar: ${pageError}`} /> : null}

        <section id="resumen" className="grid gap-4 2xl:grid-cols-[1fr_380px]">
          <SummaryCard title="Estado del alumno" description="Resumen general de su situación actual" icon={ListChecks}>
            <StatusSummary
              items={[
                { label: "Faltas", value: attendanceSummary.absences, caption: "30 días", icon: CheckCircle2, tone: "green" },
                { label: "Retrasos", value: attendanceSummary.lates, caption: "30 días", icon: Clock3, tone: "amber" },
                { label: "Incidencias", value: incidents.length, caption: "activas", icon: AlertCircle, tone: "red" },
                { label: "Observaciones", value: observations.length, caption: "internas", icon: NotebookPen, tone: "green" },
                { label: "Comunicaciones", value: communications.length, caption: "recientes", icon: Send, tone: "blue" },
                { label: "Pendientes", value: pendingFollowUps, caption: "por revisar", icon: ClipboardList, tone: "purple" }
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Última actividad" description="Lo más reciente relacionado con este alumno" icon={Clock3} className="2xl:row-span-2" id="actividad">
            <ActivityTimeline items={latestActivityItems} />
          </SummaryCard>
        </section>

        <section className="grid gap-4 2xl:grid-cols-[1fr_380px]">
          <SummaryCard title="Información académica" icon={GraduationCap} id="academico">
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Curso" value={student.courses?.name ?? student.course_id} />
              <Info label="Tutor" value={profile.full_name ?? profile.email ?? profile.id} />
              <Info label="Grupo" value={student.courses?.name ?? "Sin grupo asignado"} />
            </div>
          </SummaryCard>

          <SummaryCard title="Notas privadas del tutor" description="Notas internas para seguimiento del alumno" icon={MessageSquarePlus} id="notas-tutor">
            {observations[0] ? (
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-sm font-semibold text-foreground">{observations[0].title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{observations[0].content}</p>
                <p className="mt-2 text-xs text-muted-foreground">{observations[0].type} · {formatDate(observations[0].created_at)}</p>
              </div>
            ) : (
              <EmptyBox text="No hay notas privadas recientes." />
            )}
            <Link href="#observacion-interna" className="mt-3 inline-flex text-sm font-semibold text-primary transition hover:text-primary/80">
              Añadir nota privada
            </Link>
          </SummaryCard>
        </section>

        <FamilySummary
          recipientsCount={recipients.length}
          absences={attendanceSummary.absences}
          lates={attendanceSummary.lates}
          latestCommunication={communications[0]?.title ?? "Sin comunicaciones"}
          latestTutoring={observations[0] ? formatDate(observations[0].created_at) : "No registrada"}
        />

        <section id="historial-completo" className="grid gap-4 xl:grid-cols-2" aria-label="Historial completo bajo demanda">
          {communications.length > 0 ? (
          <WorkspacePanel id="comunicaciones" title="Comunicaciones" icon={Bell} description="Últimos mensajes relacionados con este alumno.">
            <CommunicationList communications={communications.slice(0, 5)} />
          </WorkspacePanel>
          ) : null}

          {incidents.length > 0 ? (
          <WorkspacePanel id="incidencias" title="Incidencias" icon={AlertCircle} description="Registros recientes de seguimiento.">
            <IncidentList incidents={incidents.slice(0, 5)} />
          </WorkspacePanel>
          ) : null}

          {observations.length > 0 || observationsErrorMessage ? (
          <WorkspacePanel id="observaciones" title="Observaciones internas" icon={MessageSquarePlus} description="Seguimiento privado del tutor.">
            {observationsErrorMessage ? (
              <ErrorBox message={`No se pudieron cargar las observaciones: ${observationsErrorMessage}`} />
            ) : (
              <ObservationList observations={observations.slice(0, 5)} />
            )}
          </WorkspacePanel>
          ) : null}

          {recentAttendance.length > 0 ? (
          <WorkspacePanel id="asistencia" title="Asistencia" icon={CalendarDays} description="Faltas y retrasos recientes.">
            <CompactList
              items={recentAttendance.map((record) => ({
                id: record.id,
                title: `${record.date} · ${getAttendanceLabel(record.status)}`,
                meta: record.justified ? "Justificado" : "Pendiente de justificar"
              }))}
              empty="Sin asistencia reciente."
            />
          </WorkspacePanel>
          ) : null}

          {gradeGroups.length > 0 || gradesErrorMessage || termGradesErrorMessage ? (
          <WorkspacePanel id="calificaciones" title="Calificaciones" icon={BookOpenCheck} description="Consulta filtrable de notas y cierres.">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">La introducción masiva de notas se realiza desde el cuaderno.</p>
              <Link
                href={`/dashboard/tutor/gradebook?course_id=${student.course_id}`}
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                Abrir cuaderno
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <GradeFilters
              studentId={student.id}
              subjectOptions={subjectOptions}
              grades={grades}
              searchParams={searchParams}
            />

            {gradesErrorMessage || termGradesErrorMessage ? (
              <ErrorBox message={`No se pudieron cargar las calificaciones: ${gradesErrorMessage ?? termGradesErrorMessage}`} />
            ) : gradeGroups.length === 0 ? (
              <EmptyBox text="No hay calificaciones para los filtros seleccionados." />
            ) : (
              <div className="mt-5 space-y-4">
                {gradeGroups.map((subjectGroup) => (
                  <article key={subjectGroup.subjectId} className="rounded-lg border border-border bg-background p-4">
                    <h3 className="text-sm font-semibold text-foreground">{subjectGroup.subjectName}</h3>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {Array.from(subjectGroup.terms.values()).map((termGroup) => (
                        <GradeTermCard key={termGroup.term} termGroup={termGroup} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </WorkspacePanel>
          ) : null}

          <ActionForms
            studentId={student.id}
            recipients={recipients}
            recipientsErrorMessage={recipientsErrorMessage}
          />
        </section>
      </main>
    </section>
  );
}

function QuickActions({ studentId, courseId }: { studentId: string; courseId: string }) {
  const actions = [
    { label: "Enviar comunicación", href: "#enviar-aviso", icon: Bell, primary: true },
    { label: "Añadir incidencia", href: "#registrar-incidencia", icon: AlertCircle },
    { label: "Añadir observación", href: "#observacion-interna", icon: MessageSquarePlus },
    { label: "Ver asistencia", href: "#actividad", icon: CalendarDays },
    { label: "Abrir cuaderno", href: `/dashboard/tutor/gradebook?course_id=${courseId}`, icon: BookOpenCheck },
    { label: "Ver calificaciones", href: `/dashboard/tutor/students/${studentId}#academico`, icon: ClipboardList }
  ];

  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Acciones rápidas</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                action.primary
                  ? "bg-primary text-primary-foreground shadow-sm hover:opacity-95"
                  : "border border-border bg-white hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function GradeFilters({
  studentId,
  subjectOptions,
  grades,
  searchParams
}: {
  studentId: string;
  subjectOptions: { id: string; name: string }[];
  grades: GradeWithLabels[];
  searchParams: NonNullable<TutorStudentDetailPageProps["searchParams"]>;
}) {
  const visibleAssessments = Array.from(
    new Set(
      grades
        .filter((grade) => !searchParams.subject_id || grade.subject_id === searchParams.subject_id)
        .filter((grade) => !searchParams.term || grade.term === searchParams.term)
        .map((grade) => grade.assessment_name)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <form className="mt-5 grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-4">
      <Select
        name="subject_id"
        value={searchParams.subject_id ?? ""}
        emptyLabel="Todas las materias"
        options={subjectOptions.map((subject) => ({ value: subject.id, label: subject.name }))}
      />
      <Select
        name="term"
        value={searchParams.term ?? ""}
        emptyLabel="Todos los trimestres"
        options={terms.map((term) => ({ value: term, label: `Trimestre ${term}` }))}
      />
      <Select
        name="assessment"
        value={searchParams.assessment ?? ""}
        emptyLabel="Todos los criterios/pruebas"
        options={visibleAssessments.map((assessment) => ({ value: assessment, label: assessment }))}
      />
      <div className="flex gap-2">
        <button className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Filtrar</button>
        <Link
          href={`/dashboard/tutor/students/${studentId}#calificaciones`}
          className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function ActionForms({
  studentId,
  recipients,
  recipientsErrorMessage
}: {
  studentId: string;
  recipients: { parent_id: string }[];
  recipientsErrorMessage: string | null;
}) {
  return (
    <section id="acciones-seguimiento" className="grid scroll-mt-24 gap-4 xl:col-span-2 xl:grid-cols-3">
      <details id="enviar-aviso" className="scroll-mt-24 rounded-lg border border-border bg-white p-5">
        <summary className="cursor-pointer list-none">
          <FormHeader icon={Bell} title="Enviar comunicación" description="Aviso interno visible para la familia." />
        </summary>
        {recipientsErrorMessage ? (
          <ErrorBox message={`No se pudo comprobar la familia asociada: ${recipientsErrorMessage}`} />
        ) : recipients.length === 0 ? (
          <EmptyBox text="Este alumno todavía no tiene familia asociada." />
        ) : (
          <form action={createFamilyNotification} className="mt-4 space-y-3">
            <input type="hidden" name="student_id" value={studentId} />
            <Input name="title" label="Título" required />
            <Select
              name="category"
              value="general"
              emptyLabel={null}
              options={[
                { value: "incidencia", label: "Incidencia" },
                { value: "académico", label: "Académico" },
                { value: "tutoría", label: "Tutoría" },
                { value: "general", label: "General" }
              ]}
            />
            <Textarea name="message" label="Mensaje" required rows={4} />
            <Submit label="Enviar aviso" icon={Bell} />
          </form>
        )}
      </details>

      <details id="registrar-incidencia" className="scroll-mt-24 rounded-lg border border-border bg-white p-5">
        <summary className="cursor-pointer list-none">
          <FormHeader icon={AlertCircle} title="Añadir incidencia" description="Registro vinculado a tu tutoría." />
        </summary>
        <form action={createStudentIncident} className="mt-4 space-y-3">
          <input type="hidden" name="student_id" value={studentId} />
          <Input name="type" label="Tipo" placeholder="Conducta, material, convivencia..." required />
          <Select
            name="severity"
            value="media"
            emptyLabel={null}
            options={[
              { value: "leve", label: "Leve" },
              { value: "media", label: "Media" },
              { value: "grave", label: "Grave" }
            ]}
          />
          <Textarea name="description" label="Descripción" required rows={4} />
          <Submit label="Guardar incidencia" icon={AlertCircle} />
        </form>
      </details>

      <details id="observacion-interna" className="scroll-mt-24 rounded-lg border border-border bg-white p-5">
        <summary className="cursor-pointer list-none">
          <FormHeader icon={MessageSquarePlus} title="Añadir observación interna" description="Seguimiento privado, no visible para familias." />
        </summary>
        <form action={createStudentObservation} className="mt-4 space-y-3">
          <input type="hidden" name="student_id" value={studentId} />
          <Select
            name="type"
            value="académica"
            emptyLabel={null}
            options={[
              { value: "académica", label: "Académica" },
              { value: "conductual", label: "Conductual" },
              { value: "emocional", label: "Emocional" },
              { value: "familiar", label: "Familiar" },
              { value: "adaptación", label: "Adaptación" },
              { value: "reunión", label: "Reunión" }
            ]}
          />
          <Select
            name="priority"
            value="media"
            emptyLabel={null}
            options={[
              { value: "baja", label: "Baja" },
              { value: "media", label: "Media" },
              { value: "alta", label: "Alta" }
            ]}
          />
          <Input name="title" label="Título" required />
          <Textarea name="content" label="Contenido" required rows={4} />
          <Submit label="Guardar observación" icon={MessageSquarePlus} />
        </form>
      </details>
    </section>
  );
}

function GradeTermCard({ termGroup }: { termGroup: GradeTermGroup }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground">Trimestre {termGroup.term}</h4>
        {termGroup.finalGrade ? (
          <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
            Final {termGroup.finalGrade.final_grade ?? "-"}
          </span>
        ) : (
          <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
            Sin cierre
          </span>
        )}
      </div>
      {termGroup.finalGrade ? (
        <div className="mt-3 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
          <p>Calculada: {termGroup.finalGrade.calculated_grade ?? "Pendiente"}</p>
          {termGroup.finalGrade.final_observation ? <p className="mt-1">{termGroup.finalGrade.final_observation}</p> : null}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        {termGroup.grades.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay pruebas para este trimestre.</p>
        ) : (
          termGroup.grades.map((grade) => (
            <article key={grade.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{grade.assessment_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {grade.assessment_type} {grade.assessment_date ? `· ${formatDate(grade.assessment_date)}` : ""}
                  </p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-foreground">{grade.grade}</span>
              </div>
              {grade.comment ? <p className="mt-2 text-xs text-muted-foreground">Comentario: {grade.comment}</p> : null}
              {grade.recommendation ? <p className="mt-1 text-xs text-muted-foreground">Recomendación: {grade.recommendation}</p> : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

type SubjectGradeGroup = {
  subjectId: string;
  subjectName: string;
  terms: Map<GradeTerm, GradeTermGroup>;
};

type GradeTermGroup = {
  term: GradeTerm;
  grades: GradeWithLabels[];
  finalGrade: TermSubjectGradeWithLabels | null;
};

function buildGradeGroups(grades: GradeWithLabels[], termGrades: TermSubjectGradeWithLabels[]) {
  const groups = new Map<string, SubjectGradeGroup>();

  function ensure(subjectId: string, subjectName: string, term: GradeTerm) {
    let subjectGroup = groups.get(subjectId);
    if (!subjectGroup) {
      subjectGroup = { subjectId, subjectName, terms: new Map() };
      groups.set(subjectId, subjectGroup);
    }
    let termGroup = subjectGroup.terms.get(term);
    if (!termGroup) {
      termGroup = { term, grades: [], finalGrade: null };
      subjectGroup.terms.set(term, termGroup);
    }
    return termGroup;
  }

  grades.forEach((grade) => {
    ensure(grade.subject_id, grade.subjectName, grade.term).grades.push(grade);
  });
  termGrades.forEach((grade) => {
    ensure(grade.subject_id, grade.subjectName, grade.term).finalGrade = grade;
  });

  return Array.from(groups.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es"));
}

function buildSubjectOptions(grades: GradeWithLabels[], termGrades: TermSubjectGradeWithLabels[]) {
  const entries: [string, string][] = [
    ...grades.map((grade): [string, string] => [grade.subject_id, grade.subjectName]),
    ...termGrades.map((grade): [string, string] => [grade.subject_id, grade.subjectName])
  ];

  return Array.from(new Map(entries).entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function latestItem(prefix: string, id: string | undefined, title: string, detail: string | undefined, meta: string | null) {
  if (!id || !detail || !meta) return null;

  return {
    id: `${prefix}-${id}`,
    title,
    detail,
    meta
  };
}

function BackLink() {
  return (
    <Link href="/dashboard/tutor/students" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver a Mis alumnos
    </Link>
  );
}

function StudentAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
        {initials || "AL"}
      </div>
      <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
    </div>
  );
}

function SidebarNavLink({
  href,
  icon: Icon,
  label,
  active = false
}: {
  href: string;
  icon: typeof Bell;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
        active ? "bg-primary/10 text-primary shadow-sm" : "text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

function WorkspacePanel({
  id,
  title,
  description,
  icon: Icon,
  children
}: {
  id?: string;
  title: string;
  description: string;
  icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <details id={id} className="scroll-mt-24 rounded-lg border border-border bg-white p-5 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </summary>
      <div className="mt-4 border-t border-border pt-4">{children}</div>
    </details>
  );
}

function StatusSummary({ items }: { items: StatusItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        const tone = statusToneClass(item.tone);

        return (
          <div key={item.label} className="min-w-0 rounded-xl border border-border bg-background px-3 py-3">
            <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${tone.bg} ${tone.text}`} aria-hidden="true">
              <Icon className="h-4 w-4" />
            </span>
            <p className="truncate text-xs font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xl font-semibold leading-none text-foreground">{item.value}</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.caption}</p>
          </div>
        );
      })}
    </div>
  );
}

function statusToneClass(tone: StatusItem["tone"]) {
  switch (tone) {
    case "green":
      return { bg: "bg-emerald-50", text: "text-emerald-700" };
    case "amber":
      return { bg: "bg-amber-50", text: "text-amber-700" };
    case "red":
      return { bg: "bg-rose-50", text: "text-rose-700" };
    case "blue":
      return { bg: "bg-sky-50", text: "text-sky-700" };
    case "purple":
      return { bg: "bg-violet-50", text: "text-violet-700" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700" };
  }
}

function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin movimientos registrados durante los últimos 30 días.</p>;
  }

  return (
    <ol className="relative space-y-4 before:absolute before:left-4 before:top-4 before:h-[calc(100%-2rem)] before:w-px before:bg-border">
      {items.map((item) => {
        const activity = activityStyle(item.title);
        const Icon = activity.icon;

        return (
          <li key={item.id} className="relative flex gap-3">
            <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activity.bg} ${activity.text}`} aria-hidden="true">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 pb-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.detail}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function activityStyle(title: string) {
  if (title.includes("Comunicación")) return { icon: Bell, bg: "bg-sky-50", text: "text-sky-700" };
  if (title.includes("Incidencia")) return { icon: AlertCircle, bg: "bg-rose-50", text: "text-rose-700" };
  if (title.includes("Observación")) return { icon: MessageSquarePlus, bg: "bg-emerald-50", text: "text-emerald-700" };
  if (title.includes("Asistencia")) return { icon: CalendarDays, bg: "bg-amber-50", text: "text-amber-700" };
  return { icon: ClipboardList, bg: "bg-violet-50", text: "text-violet-700" };
}

function SummaryCard({
  id,
  title,
  description,
  icon: Icon,
  children,
  className = ""
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: typeof Bell;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-xl border border-border bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FamilySummary({
  recipientsCount,
  absences,
  lates,
  latestCommunication,
  latestTutoring
}: {
  recipientsCount: number;
  absences: number;
  lates: number;
  latestCommunication: string;
  latestTutoring: string;
}) {
  return (
    <section className="scroll-mt-24 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] md:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <Users className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Familia vinculada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {recipientsCount > 0
                ? `${recipientsCount} familiar${recipientsCount === 1 ? "" : "es"} asociado${recipientsCount === 1 ? "" : "s"} para comunicaciones.`
                : "Sin familia vinculada todavía."}
            </p>
          </div>
        </div>
        <CompactStat label="Faltas" value={String(absences)} />
        <CompactStat label="Retrasos" value={String(lates)} />
        <CompactStat label="Última comunicación" value={latestCommunication} />
        <CompactStat label="Última tutoría" value={latestTutoring} />
      </div>
    </section>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-border md:border-l md:pl-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CompactList({ items, empty }: { items: { id: string; title: string; meta: string }[]; empty: string }) {
  if (items.length === 0) return <EmptyBox text={empty} />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-border bg-background p-3">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
        </div>
      ))}
    </div>
  );
}

function IncidentList({ incidents }: { incidents: StudentIncident[] }) {
  if (incidents.length === 0) return <EmptyBox text="No hay incidencias recientes." />;

  return (
    <CompactList
      items={incidents.map((incident) => ({
        id: incident.id,
        title: incident.type,
        meta: `${incident.severity} · ${formatDate(incident.created_at)}`
      }))}
      empty="No hay incidencias recientes."
    />
  );
}

function CommunicationList({ communications }: { communications: TutorCommunication[] }) {
  if (communications.length === 0) return <EmptyBox text="No hay comunicaciones recientes." />;

  return (
    <CompactList
      items={communications.map((communication) => ({
        id: communication.id,
        title: communication.title,
        meta: `${communication.direction === "sent" ? "Enviada" : "Recibida"} · ${communication.counterpartName}`
      }))}
      empty="No hay comunicaciones recientes."
    />
  );
}

function ObservationList({ observations }: { observations: StudentObservation[] }) {
  if (observations.length === 0) return <EmptyBox text="No hay observaciones internas recientes." />;

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {observations.map((observation) => (
        <article key={observation.id} className="rounded-md border border-border bg-background p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{observation.title}</h3>
            <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium capitalize">{observation.priority}</span>
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{observation.content}</p>
          <p className="mt-3 text-xs text-muted-foreground">{observation.type} · {formatDate(observation.created_at)}</p>
        </article>
      ))}
    </div>
  );
}

function FormHeader({ icon: Icon, title, description }: { icon: typeof Bell; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Input({ name, label, required = false, placeholder }: { name: string; label: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function Textarea({ name, label, required = false, rows = 3 }: { name: string; label: string; required?: boolean; rows?: number }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        name={name}
        required={required}
        rows={rows}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function Select({
  name,
  value,
  options,
  emptyLabel
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  emptyLabel: string | null;
}) {
  return (
    <select name={name} defaultValue={value} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
      {emptyLabel ? <option value="">{emptyLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Submit({ label, icon: Icon }: { label: string; icon: typeof Bell }) {
  return (
    <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">{text}</div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}
