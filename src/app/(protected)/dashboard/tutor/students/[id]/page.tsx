import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  MessageSquarePlus,
  ShieldCheck
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
          <p className="mt-2 text-sm text-muted-foreground">La ficha solicitada no pertenece a tu tutoria o no existe.</p>
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

  return (
    <section className="space-y-6">
      <BackLink />

      <header className="rounded-lg border border-border bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                {student.name} {student.last_name}
              </h1>
              <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {student.active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.courses?.name ?? student.course_id} · Tutor: {profile.full_name ?? profile.email ?? profile.id}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
            <Metric label="Faltas" value={attendanceSummary.absences} />
            <Metric label="Retrasos" value={attendanceSummary.lates} />
          </div>
        </div>
      </header>

      <QuickActions studentId={student.id} courseId={student.course_id} />

      {pageError ? <ErrorBox message={`Parte de la ficha no se pudo cargar: ${pageError}`} /> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <SummaryCard title="Resumen compacto" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Curso" value={student.courses?.name ?? student.course_id} />
            <Info label="Tutor" value={profile.full_name ?? profile.email ?? profile.id} />
            <Info label="Ultima incidencia" value={incidents[0]?.type ?? "Sin incidencias"} />
            <Info label="Ultima observacion interna" value={observations[0]?.title ?? "Sin observaciones"} />
            <Info label="Ultima comunicacion" value={communications[0]?.title ?? "Sin comunicaciones"} />
            <Info label="Ultima calificacion" value={grades[0] ? `${grades[0].subjectName}: ${grades[0].grade}` : "Sin calificaciones"} />
          </div>
        </SummaryCard>

        <SummaryCard title="Seguimiento reciente">
          <CompactList
            items={[
              ...incidents.slice(0, 2).map((incident) => ({
                id: `incident-${incident.id}`,
                title: incident.type,
                meta: `Incidencia · ${formatDate(incident.created_at)}`
              })),
              ...observations.slice(0, 2).map((observation) => ({
                id: `observation-${observation.id}`,
                title: observation.title,
                meta: `Observacion · ${formatDate(observation.created_at)}`
              }))
            ]}
            empty="Sin seguimiento reciente."
          />
        </SummaryCard>
      </section>

      <section id="calificaciones" className="rounded-lg border border-border bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <BookOpenCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Calificaciones</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Consulta filtrable. La introduccion masiva de notas se realiza desde el cuaderno.
              </p>
            </div>
          </div>
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
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <CompactSection id="asistencia" title="Asistencia reciente" icon={CalendarDays}>
          {recentAttendance.length === 0 ? (
            <EmptyBox text="Sin faltas ni retrasos recientes." />
          ) : (
            <CompactList
              items={recentAttendance.map((record) => ({
                id: record.id,
                title: `${record.date} · ${getAttendanceLabel(record.status)}`,
                meta: record.justified ? "Justificado" : "Pendiente de justificar"
              }))}
              empty="Sin asistencia reciente."
            />
          )}
        </CompactSection>

        <CompactSection id="historial" title="Incidencias recientes" icon={AlertCircle}>
          <IncidentList incidents={incidents.slice(0, 5)} />
        </CompactSection>

        <CompactSection title="Comunicaciones recientes" icon={Bell}>
          <CommunicationList communications={communications.slice(0, 5)} />
        </CompactSection>
      </section>

      <ActionForms
        studentId={student.id}
        recipients={recipients}
        recipientsErrorMessage={recipientsErrorMessage}
      />

      <section id="observaciones" className="rounded-lg border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <MessageSquarePlus className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Observaciones internas recientes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Vista compacta de seguimiento privado.</p>
          </div>
        </div>
        {observationsErrorMessage ? (
          <ErrorBox message={`No se pudieron cargar las observaciones: ${observationsErrorMessage}`} />
        ) : (
          <ObservationList observations={observations.slice(0, 5)} />
        )}
      </section>
    </section>
  );
}

function QuickActions({ studentId, courseId }: { studentId: string; courseId: string }) {
  const actions = [
    { label: "Enviar comunicacion", href: "#enviar-aviso", icon: Bell, primary: true },
    { label: "Anadir incidencia", href: "#registrar-incidencia", icon: AlertCircle },
    { label: "Anadir observacion interna", href: "#observacion-interna", icon: MessageSquarePlus },
    { label: "Ver asistencia", href: "#asistencia", icon: CalendarDays },
    { label: "Abrir cuaderno", href: `/dashboard/tutor/gradebook?course_id=${courseId}`, icon: BookOpenCheck },
    { label: "Ver calificaciones", href: `/dashboard/tutor/students/${studentId}#calificaciones`, icon: ClipboardList }
  ];

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <h2 className="text-sm font-semibold text-foreground">Acciones rapidas</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition ${
                action.primary
                  ? "bg-primary text-primary-foreground hover:opacity-95"
                  : "border border-border bg-white hover:bg-muted"
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
    <section className="grid gap-4 xl:grid-cols-3">
      <section id="enviar-aviso" className="rounded-lg border border-border bg-white p-5">
        <FormHeader icon={Bell} title="Enviar comunicacion" description="Aviso interno visible para la familia." />
        {recipientsErrorMessage ? (
          <ErrorBox message={`No se pudo comprobar la familia asociada: ${recipientsErrorMessage}`} />
        ) : recipients.length === 0 ? (
          <EmptyBox text="Este alumno todavia no tiene familia asociada." />
        ) : (
          <form action={createFamilyNotification} className="mt-4 space-y-3">
            <input type="hidden" name="student_id" value={studentId} />
            <Input name="title" label="Titulo" required />
            <Select
              name="category"
              value="general"
              emptyLabel={null}
              options={[
                { value: "incidencia", label: "Incidencia" },
                { value: "académico", label: "Academico" },
                { value: "tutoría", label: "Tutoria" },
                { value: "general", label: "General" }
              ]}
            />
            <Textarea name="message" label="Mensaje" required rows={4} />
            <Submit label="Enviar aviso" icon={Bell} />
          </form>
        )}
      </section>

      <section id="registrar-incidencia" className="rounded-lg border border-border bg-white p-5">
        <FormHeader icon={AlertCircle} title="Anadir incidencia" description="Registro vinculado a tu tutoria." />
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
          <Textarea name="description" label="Descripcion" required rows={4} />
          <Submit label="Guardar incidencia" icon={AlertCircle} />
        </form>
      </section>

      <section id="observacion-interna" className="rounded-lg border border-border bg-white p-5">
        <FormHeader icon={MessageSquarePlus} title="Anadir observacion interna" description="Seguimiento privado, no visible para familias." />
        <form action={createStudentObservation} className="mt-4 space-y-3">
          <input type="hidden" name="student_id" value={studentId} />
          <Select
            name="type"
            value="académica"
            emptyLabel={null}
            options={[
              { value: "académica", label: "Academica" },
              { value: "conductual", label: "Conductual" },
              { value: "emocional", label: "Emocional" },
              { value: "familiar", label: "Familiar" },
              { value: "adaptación", label: "Adaptacion" },
              { value: "reunión", label: "Reunion" }
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
          <Input name="title" label="Titulo" required />
          <Textarea name="content" label="Contenido" required rows={4} />
          <Submit label="Guardar observacion" icon={MessageSquarePlus} />
        </form>
      </section>
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
              {grade.recommendation ? <p className="mt-1 text-xs text-muted-foreground">Recomendacion: {grade.recommendation}</p> : null}
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

function BackLink() {
  return (
    <Link href="/dashboard/tutor/students" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver a Mis alumnos
    </Link>
  );
}

function SummaryCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-white p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CompactSection({
  id,
  title,
  icon: Icon,
  children
}: {
  id?: string;
  title: string;
  icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
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
