import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Inbox,
  LockKeyhole,
  UserRound
} from "lucide-react";
import { getFamilyAttendance, getAttendanceLabel, type FamilyAttendanceRow } from "@/lib/attendance/attendance";
import { requireRole } from "@/lib/auth/session";
import { getFamilyCommunications, getFamilyStudentContacts, type FamilyCommunication } from "@/lib/communications/notifications";
import { getFamilyVisibleIncidents, type FamilyVisibleIncident } from "@/lib/family/student";
import {
  getEvaluationPublication,
  getFamilyGrades,
  getFamilyTermSubjectGrades,
  type GradeTerm,
  type GradeWithLabels,
  type TermSubjectGradeWithLabels
} from "@/lib/grades/grades";

type PageProps = {
  searchParams?: {
    student_id?: string;
  };
};

const terms: GradeTerm[] = ["1", "2", "3"];

export default async function FamilyStudentPage({ searchParams = {} }: PageProps) {
  const profile = await requireRole("family");
  const [
    { students, errorMessage: contactsError },
    { rows: attendanceRows, errorMessage: attendanceError },
    { communications, errorMessage: communicationsError },
    { grades, errorMessage: gradesError },
    { termGrades, errorMessage: termGradesError }
  ] = await Promise.all([
    getFamilyStudentContacts(profile.id),
    getFamilyAttendance(profile.id),
    getFamilyCommunications(profile.id),
    getFamilyGrades(profile.id),
    getFamilyTermSubjectGrades(profile.id)
  ]);
  const selectedStudent =
    students.find((student) => student.id === searchParams.student_id) ?? students[0] ?? null;
  const { incidents, errorMessage: incidentsError } = await getFamilyVisibleIncidents(
    profile.id,
    selectedStudent?.id
  );
  const pageError = contactsError ?? attendanceError ?? communicationsError ?? gradesError ?? termGradesError ?? incidentsError;
  const selectedAttendance = selectedStudent
    ? attendanceRows.filter((row) => row.student_id === selectedStudent.id)
    : [];
  const selectedCommunications = selectedStudent
    ? communications.filter((communication) => communication.student_id === selectedStudent.id)
    : [];
  const selectedGrades = selectedStudent ? grades.filter((grade) => grade.student_id === selectedStudent.id) : [];
  const selectedTermGrades = selectedStudent
    ? termGrades.filter((grade) => grade.student_id === selectedStudent.id)
    : [];
  const publications = selectedStudent ? await getPublicationStates(selectedStudent.course_id) : new Map();

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Alumno</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen diario familiar de asistencia, seguimiento, comunicaciones y calificaciones.
          </p>
        </div>
        <Link
          href="/dashboard/family"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al dashboard
        </Link>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte del resumen: {pageError}
        </div>
      ) : null}

      {students.length > 1 ? (
        <form className="rounded-lg border border-border bg-white p-4" action="/dashboard/family/student">
          <label className="block max-w-md space-y-1 text-sm font-medium text-foreground">
            Seleccionar hijo
            <select
              name="student_id"
              defaultValue={selectedStudent?.id ?? ""}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.last_name} - {student.courseName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Ver resumen
          </button>
        </form>
      ) : null}

      {!selectedStudent ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay alumnos vinculados a esta cuenta familiar.
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-border bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedStudent.name} {selectedStudent.last_name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedStudent.courseName}</p>
                  <p className="text-sm text-muted-foreground">Tutor: {selectedStudent.tutorName}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Metric label="Faltas recientes" value={countAttendance(selectedAttendance, "absent")} />
                <Metric label="Retrasos recientes" value={countAttendance(selectedAttendance, "late")} />
                <Metric label="Mensajes recientes" value={selectedCommunications.length} />
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <SummaryCard title="Asistencia reciente" icon={CalendarDays}>
              <AttendanceList rows={selectedAttendance.slice(0, 5)} />
            </SummaryCard>

            <SummaryCard title="Incidencias visibles" icon={AlertTriangle}>
              <IncidentList incidents={incidents.slice(0, 5)} />
            </SummaryCard>

            <SummaryCard title="Comunicaciones recientes" icon={Inbox}>
              <CommunicationList communications={selectedCommunications.slice(0, 5)} />
            </SummaryCard>

            <SummaryCard title="Calificaciones recientes" icon={BookOpenCheck}>
              <GradeList grades={selectedGrades.slice(0, 5)} termGrades={selectedTermGrades.slice(0, 3)} />
            </SummaryCard>
          </div>

          <section className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Boletines</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estado de boletines trimestrales preparados para publicación oficial.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {terms.map((term) => {
                const publication = publications.get(term);
                const isPublished = Boolean(publication?.published);

                return (
                  <div key={term} className="rounded-md border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">{term}.o trimestre</p>
                    {isPublished ? (
                      <>
                        <p className="mt-1 text-xs text-green-700">
                          Disponible{publication?.published_at ? ` desde ${formatDate(publication.published_at)}` : ""}.
                        </p>
                        <Link
                          href={`/dashboard/family/grades?student_id=${selectedStudent.id}&term=${term}`}
                          className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                          Ver boletín
                        </Link>
                      </>
                    ) : (
                      <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                        <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        El boletín de esta evaluación todavía no está disponible.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: typeof CalendarDays;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AttendanceList({ rows }: { rows: FamilyAttendanceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState text="No hay faltas ni retrasos recientes." />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{getAttendanceLabel(row.status)}</p>
            <span className="text-xs text-muted-foreground">{formatDate(row.date)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.justified ? "Justificado" : "Pendiente de justificar"}
            {row.notes ? ` - ${row.notes}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function IncidentList({ incidents }: { incidents: FamilyVisibleIncident[] }) {
  if (incidents.length === 0) {
    return <EmptyState text="No hay incidencias visibles recientes." />;
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <div key={incident.id} className="rounded-md border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{incident.type}</p>
            <span className="rounded-md border border-border bg-white px-2 py-1 text-xs text-muted-foreground">
              {incident.severity}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{incident.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(incident.created_at)}</p>
        </div>
      ))}
    </div>
  );
}

function CommunicationList({ communications }: { communications: FamilyCommunication[] }) {
  if (communications.length === 0) {
    return <EmptyState text="No hay comunicaciones recientes para este alumno." />;
  }

  return (
    <div className="space-y-3">
      {communications.map((communication) => (
        <div key={communication.id} className="rounded-md border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{communication.title}</p>
            <span className="text-xs text-muted-foreground">{communication.direction === "sent" ? "Enviado" : "Recibido"}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {communication.counterpartName} - {communication.category}
          </p>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{communication.message}</p>
        </div>
      ))}
    </div>
  );
}

function GradeList({
  grades,
  termGrades
}: {
  grades: GradeWithLabels[];
  termGrades: TermSubjectGradeWithLabels[];
}) {
  if (grades.length === 0 && termGrades.length === 0) {
    return <EmptyState text="No hay calificaciones recientes visibles." />;
  }

  return (
    <div className="space-y-3">
      {termGrades.map((grade) => (
        <div key={grade.id} className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{grade.subjectName}</p>
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
              Final {grade.final_grade ?? "-"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{grade.term}.o trimestre</p>
          {grade.final_observation ? <p className="mt-2 text-xs text-muted-foreground">{grade.final_observation}</p> : null}
        </div>
      ))}
      {grades.map((grade) => (
        <div key={grade.id} className="rounded-md border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{grade.subjectName}</p>
              <p className="text-xs text-muted-foreground">
                {grade.assessment_name} - {grade.term}.o trimestre
              </p>
            </div>
            <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-foreground">{grade.grade}</span>
          </div>
          {grade.comment ? <p className="mt-2 text-xs text-muted-foreground">{grade.comment}</p> : null}
          {grade.recommendation ? <p className="mt-1 text-xs text-muted-foreground">{grade.recommendation}</p> : null}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">{text}</p>;
}

async function getPublicationStates(courseId: string) {
  const results = await Promise.all(
    terms.map(async (term) => {
      const { publication } = await getEvaluationPublication({ courseId, term });
      return [term, publication] as const;
    })
  );

  return new Map(results);
}

function countAttendance(rows: FamilyAttendanceRow[], status: "absent" | "late") {
  return rows.filter((row) => row.status === status).length;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
