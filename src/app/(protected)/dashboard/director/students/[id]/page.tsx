import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpen,
  ClipboardList,
  Eye,
  FileText,
  GraduationCap,
  MessageSquarePlus,
  ShieldCheck
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAttendanceLabel, type AttendanceRecord } from "@/lib/attendance/attendance";
import type { DirectorCommunication } from "@/lib/communications/notifications";
import { getDirectorStudentDetail } from "@/lib/director/students";
import {
  getGradesForStudent,
  getTermSubjectGradesForStudent,
  type GradeTerm,
  type GradeWithLabels,
  type TermSubjectGradeWithLabels
} from "@/lib/grades/grades";
import type { StudentIncident, StudentObservation, TutorStudentDetail } from "@/lib/tutors/students";

type DirectorStudentTab = "resumen" | "comunicaciones" | "calificaciones" | "incidencias" | "asistencia" | "observaciones";

type DirectorStudentDetailPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    tab?: string;
    category?: string;
    status?: string;
    subject_id?: string;
    term?: string;
  };
};

const tabs: Array<{ id: DirectorStudentTab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "comunicaciones", label: "Comunicaciones" },
  { id: "calificaciones", label: "Calificaciones" },
  { id: "incidencias", label: "Incidencias" },
  { id: "asistencia", label: "Asistencia" },
  { id: "observaciones", label: "Observaciones internas" }
];

export default async function DirectorStudentDetailPage({ params, searchParams }: DirectorStudentDetailPageProps) {
  await requireRole("director");

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
      <section className="space-y-6">
        <BackLink />
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la ficha del alumno: {errorMessage}
        </div>
      </section>
    );
  }

  if (!student) {
    return (
      <section className="space-y-6">
        <BackLink />
        <div className="rounded-lg border border-border bg-white p-6">
          <h1 className="text-xl font-semibold text-foreground">Alumno no encontrado</h1>
        </div>
      </section>
    );
  }

  const absences = attendance.filter((record) => record.status === "absent").length;
  const lates = attendance.filter((record) => record.status === "late").length;

  return (
    <section className="space-y-6">
      <BackLink />

      <header className="rounded-lg border border-border bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                {student.name} {student.last_name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {student.active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Supervisión académica, convivencia, asistencia y comunicaciones.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Metric label="Faltas" value={absences} />
            <Metric label="Retrasos" value={lates} />
            <Metric label="Incidencias" value={incidents.length} />
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Algunos datos de seguimiento no se pudieron cargar: {errorMessage}
        </div>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-2" aria-label="Pestañas de ficha">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(params.id, tab.id)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "resumen" ? (
        <SummaryTab
          student={student}
          attendance={attendance}
          incidents={incidents}
          observations={observations}
          communications={communications}
          grades={grades}
        />
      ) : null}

      {activeTab === "comunicaciones" ? (
        <CommunicationsTab
          studentId={params.id}
          communications={communications}
          category={searchParams?.category}
          status={searchParams?.status}
        />
      ) : null}

      {activeTab === "calificaciones" ? (
        <GradesTab
          studentId={params.id}
          grades={grades}
          termGrades={termGrades}
          errorMessage={gradesErrorMessage ?? termGradesErrorMessage}
          selectedSubjectId={searchParams?.subject_id}
          selectedTerm={searchParams?.term}
        />
      ) : null}

      {activeTab === "incidencias" ? <IncidentsTab incidents={incidents} /> : null}
      {activeTab === "asistencia" ? <AttendanceTab attendance={attendance} /> : null}
      {activeTab === "observaciones" ? <ObservationsTab observations={observations} /> : null}
    </section>
  );
}

function SummaryTab({
  student,
  attendance,
  incidents,
  observations,
  communications,
  grades
}: {
  student: TutorStudentDetail;
  attendance: AttendanceRecord[];
  incidents: StudentIncident[];
  observations: StudentObservation[];
  communications: DirectorCommunication[];
  grades: GradeWithLabels[];
}) {
  const absences = attendance.filter((record) => record.status === "absent").length;
  const lates = attendance.filter((record) => record.status === "late").length;
  const recentIncidents = incidents.slice(0, 3);
  const alerts = buildAlerts(absences, lates, incidents, observations, communications, grades);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <section className="rounded-lg border border-border bg-white p-5">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Resumen del alumno</h2>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" value={student.name} />
          <Field label="Apellidos" value={student.last_name} />
          <Field label="Fecha de nacimiento" value={student.birth_date ?? "Sin fecha registrada"} />
          <Field label="Curso" value={student.courses?.name ?? student.course_id} />
          <Field label="Tutor" value="Tutor asociado al curso" />
          <Field label="Estado" value={student.active ? "Activo" : "Inactivo"} />
        </dl>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Faltas acumuladas" value={String(absences)} />
          <SummaryCard label="Retrasos acumulados" value={String(lates)} />
          <SummaryCard label="Última observación" value={observations[0]?.title ?? "Sin observaciones"} />
          <SummaryCard label="Última comunicación" value={communications[0]?.title ?? "Sin comunicaciones"} />
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Últimas alertas relevantes</h2>
          </div>
          {alerts.length === 0 ? (
            <EmptyState text="No hay alertas relevantes en este momento." />
          ) : (
            <div className="mt-4 space-y-2">
              {alerts.map((alert) => (
                <p key={alert} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {alert}
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Últimas incidencias</h2>
          </div>
          {recentIncidents.length === 0 ? (
            <EmptyState text="No hay incidencias registradas." />
          ) : (
            <div className="mt-4 space-y-3">
              {recentIncidents.map((incident) => (
                <CompactIncident key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function CommunicationsTab({
  studentId,
  communications,
  category,
  status
}: {
  studentId: string;
  communications: DirectorCommunication[];
  category?: string;
  status?: string;
}) {
  const categories = Array.from(new Set(communications.map((communication) => communication.category))).sort();
  const filtered = communications.filter((communication) => {
    const matchesCategory = !category || communication.category === category;
    const matchesStatus =
      !status || status === "all" || (status === "read" && communication.read) || (status === "unread" && !communication.read);
    return matchesCategory && matchesStatus;
  });

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <SectionHeader
        icon={<Bell className="h-5 w-5 text-primary" aria-hidden="true" />}
        title="Comunicaciones"
        description="Comunicaciones vinculadas a este alumno, con filtros básicos de supervisión."
      />
      <FilterForm action={`/dashboard/director/students/${studentId}`} tab="comunicaciones">
        <SelectField
          label="Categoría"
          name="category"
          defaultValue={category ?? ""}
          options={categories.map((item) => ({ value: item, label: item }))}
          emptyLabel="Todas las categorías"
        />
        <SelectField
          label="Estado"
          name="status"
          defaultValue={status ?? ""}
          options={[
            { value: "unread", label: "No leídas" },
            { value: "read", label: "Leídas" }
          ]}
          emptyLabel="Todos los estados"
        />
      </FilterForm>

      {filtered.length === 0 ? (
        <EmptyState text="No hay comunicaciones que coincidan con los filtros." />
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((communication) => (
            <article key={communication.id} className="rounded-md border border-border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MessageSquarePlus className="h-4 w-4 text-primary" aria-hidden="true" />
                    <Badge>{communication.category}</Badge>
                    <Badge>{communication.read ? "Leída" : "No leída"}</Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{communication.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{communication.message}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {communication.senderName} → {communication.receiverName}
                  </p>
                </div>
                <DateText value={communication.created_at} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function GradesTab({
  studentId,
  grades,
  termGrades,
  errorMessage,
  selectedSubjectId,
  selectedTerm
}: {
  studentId: string;
  grades: GradeWithLabels[];
  termGrades: TermSubjectGradeWithLabels[];
  errorMessage: string | null;
  selectedSubjectId?: string;
  selectedTerm?: string;
}) {
  const subjectOptions = buildSubjectOptions(grades, termGrades);
  const filteredGrades = grades.filter((grade) => {
    const matchesSubject = !selectedSubjectId || grade.subject_id === selectedSubjectId;
    const matchesTerm = !selectedTerm || grade.term === selectedTerm;
    return matchesSubject && matchesTerm;
  });
  const filteredTermGrades = termGrades.filter((grade) => {
    const matchesSubject = !selectedSubjectId || grade.subject_id === selectedSubjectId;
    const matchesTerm = !selectedTerm || grade.term === selectedTerm;
    return matchesSubject && matchesTerm;
  });
  const grouped = groupGrades(filteredGrades, filteredTermGrades);

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <SectionHeader
        icon={<GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />}
        title="Calificaciones"
        description="Vista agrupada por materia, trimestre y criterio o prueba."
      />
      <FilterForm action={`/dashboard/director/students/${studentId}`} tab="calificaciones">
        <SelectField
          label="Materia"
          name="subject_id"
          defaultValue={selectedSubjectId ?? ""}
          options={subjectOptions}
          emptyLabel="Todas las materias"
        />
        <SelectField
          label="Trimestre"
          name="term"
          defaultValue={selectedTerm ?? ""}
          options={[
            { value: "1", label: "Trimestre 1" },
            { value: "2", label: "Trimestre 2" },
            { value: "3", label: "Trimestre 3" }
          ]}
          emptyLabel="Todos los trimestres"
        />
      </FilterForm>

      {errorMessage ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar todas las calificaciones: {errorMessage}
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <EmptyState text="No hay calificaciones que coincidan con los filtros." />
      ) : (
        <div className="mt-5 space-y-5">
          {grouped.map((subject) => (
            <article key={subject.subjectId} className="rounded-lg border border-border p-4">
              <h3 className="text-base font-semibold text-foreground">{subject.subjectName}</h3>
              <div className="mt-4 space-y-4">
                {subject.terms.map((term) => (
                  <div key={`${subject.subjectId}-${term.term}`} className="rounded-md border border-border bg-secondary/40 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Trimestre {term.term}</h4>
                        {term.finalGrade ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Nota final: {term.finalGrade.final_grade ?? "Pendiente"} · Calculada:{" "}
                            {formatNullableGrade(term.finalGrade.calculated_grade)} · Estado: {term.finalGrade.status}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">Sin cierre trimestral registrado.</p>
                        )}
                        {term.finalGrade?.final_observation ? (
                          <p className="mt-1 text-sm text-muted-foreground">Observación final: {term.finalGrade.final_observation}</p>
                        ) : null}
                      </div>
                    </div>

                    {term.grades.length === 0 ? (
                      <EmptyState text="No hay pruebas parciales registradas para este trimestre." compact />
                    ) : (
                      <div className="mt-4 grid gap-3">
                        {term.grades.map((grade) => (
                          <div key={grade.id} className="rounded-md border border-border bg-white p-3 text-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {grade.assessment_name} · {grade.grade}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{grade.assessment_date ?? "Sin fecha"}</p>
                              </div>
                              <Badge>{grade.assessment_type}</Badge>
                            </div>
                            {grade.comment ? <p className="mt-3 text-muted-foreground">Comentario: {grade.comment}</p> : null}
                            {grade.recommendation ? (
                              <p className="mt-1 text-muted-foreground">Recomendación: {grade.recommendation}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function IncidentsTab({ incidents }: { incidents: StudentIncident[] }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <SectionHeader
        icon={<AlertCircle className="h-5 w-5 text-primary" aria-hidden="true" />}
        title="Incidencias"
        description="Historial compacto ordenado por fecha."
      />
      {incidents.length === 0 ? (
        <EmptyState text="No hay incidencias registradas." />
      ) : (
        <div className="mt-5 space-y-3">
          {incidents.map((incident) => (
            <CompactIncident key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </section>
  );
}

function AttendanceTab({ attendance }: { attendance: AttendanceRecord[] }) {
  const relevantAttendance = attendance.filter((record) => record.status === "absent" || record.status === "late");

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <SectionHeader
        icon={<ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />}
        title="Asistencia"
        description="Faltas y retrasos ordenados por fecha."
      />
      {relevantAttendance.length === 0 ? (
        <EmptyState text="No hay faltas ni retrasos registrados." />
      ) : (
        <div className="mt-5 space-y-3">
          {relevantAttendance.map((record) => (
            <article key={record.id} className="rounded-md border border-border p-4 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {record.date} · {getAttendanceLabel(record.status)}
                  </p>
                  {record.notes ? <p className="mt-1 text-muted-foreground">{record.notes}</p> : null}
                </div>
                <Badge>{record.justified ? "Justificado" : "Pendiente de justificar"}</Badge>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ObservationsTab({ observations }: { observations: StudentObservation[] }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <SectionHeader
        icon={<BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />}
        title="Observaciones internas"
        description="Seguimiento pedagógico privado en modo solo lectura."
      />
      {observations.length === 0 ? (
        <EmptyState text="No hay observaciones internas registradas." />
      ) : (
        <div className="mt-5 space-y-3">
          {observations.map((observation) => (
            <article key={observation.id} className="rounded-md border border-border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{observation.type}</Badge>
                    <Badge>Prioridad {observation.priority}</Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{observation.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{observation.content}</p>
                </div>
                <DateText value={observation.created_at} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/director/students"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver a alumnos
    </Link>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FilterForm({
  action,
  tab,
  children
}: {
  action: string;
  tab: DirectorStudentTab;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className="mt-5 rounded-lg border border-border bg-secondary/40 p-4">
      <input type="hidden" name="tab" value={tab} />
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        {children}
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          Aplicar
        </button>
      </div>
    </form>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  emptyLabel
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
  emptyLabel: string;
}) {
  return (
    <label className="text-sm font-medium text-foreground">
      {label}
      <select
        name={name}
        className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        defaultValue={defaultValue}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2 text-center">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CompactIncident({ incident }: { incident: StudentIncident }) {
  return (
    <article className="rounded-md border border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{incident.type}</Badge>
            <Badge>{incident.severity}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{incident.description}</p>
        </div>
        <DateText value={incident.created_at} />
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-md border border-border bg-white px-2 py-1 text-xs font-medium capitalize text-foreground">
      {children}
    </span>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-md border border-dashed border-border text-sm text-muted-foreground ${compact ? "mt-3 p-3" : "mt-5 p-4"}`}>
      {text}
    </div>
  );
}

function DateText({ value }: { value: string }) {
  return (
    <p className="whitespace-nowrap text-xs text-muted-foreground">
      {new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value))}
    </p>
  );
}

function normalizeTab(tab?: string): DirectorStudentTab {
  return tabs.some((item) => item.id === tab) ? (tab as DirectorStudentTab) : "resumen";
}

function tabHref(studentId: string, tab: DirectorStudentTab, filters: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ tab });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/dashboard/director/students/${studentId}?${params.toString()}`;
}

function buildAlerts(
  absences: number,
  lates: number,
  incidents: StudentIncident[],
  observations: StudentObservation[],
  communications: DirectorCommunication[],
  grades: GradeWithLabels[]
) {
  const alerts: string[] = [];
  const recentIncidents = incidents.filter((incident) => isWithinDays(incident.created_at, 7)).length;
  const lowGrades = grades.filter((grade) => Number(grade.grade) < 5).length;

  if (absences >= 3) alerts.push(`${absences} faltas acumuladas.`);
  if (lates >= 3) alerts.push(`${lates} retrasos acumulados.`);
  if (recentIncidents >= 2) alerts.push(`${recentIncidents} incidencias registradas en los últimos 7 días.`);
  if (lowGrades > 0) alerts.push(`${lowGrades} calificación(es) por debajo de 5.`);
  if (communications.some((communication) => !communication.read)) alerts.push("Hay comunicaciones no leídas vinculadas al alumno.");
  if (observations.some((observation) => observation.priority === "alta")) alerts.push("Existe observación interna de prioridad alta.");

  return alerts;
}

function isWithinDays(value: string, days: number) {
  const createdAt = new Date(value).getTime();
  const limit = Date.now() - days * 24 * 60 * 60 * 1000;
  return createdAt >= limit;
}

function buildSubjectOptions(grades: GradeWithLabels[], termGrades: TermSubjectGradeWithLabels[]) {
  const subjects = new Map<string, string>();
  grades.forEach((grade) => subjects.set(grade.subject_id, grade.subjectName));
  termGrades.forEach((grade) => subjects.set(grade.subject_id, grade.subjectName));

  return Array.from(subjects.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

function groupGrades(grades: GradeWithLabels[], termGrades: TermSubjectGradeWithLabels[]) {
  const subjects = new Map<
    string,
    {
      subjectId: string;
      subjectName: string;
      terms: Map<GradeTerm, { term: GradeTerm; grades: GradeWithLabels[]; finalGrade: TermSubjectGradeWithLabels | null }>;
    }
  >();

  const ensureTerm = (subjectId: string, subjectName: string, term: GradeTerm) => {
    if (!subjects.has(subjectId)) {
      subjects.set(subjectId, { subjectId, subjectName, terms: new Map() });
    }

    const subject = subjects.get(subjectId)!;
    if (!subject.terms.has(term)) {
      subject.terms.set(term, { term, grades: [], finalGrade: null });
    }

    return subject.terms.get(term)!;
  };

  grades.forEach((grade) => {
    ensureTerm(grade.subject_id, grade.subjectName, grade.term).grades.push(grade);
  });

  termGrades.forEach((grade) => {
    ensureTerm(grade.subject_id, grade.subjectName, grade.term).finalGrade = grade;
  });

  return Array.from(subjects.values())
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es"))
    .map((subject) => ({
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      terms: Array.from(subject.terms.values()).sort((a, b) => Number(a.term) - Number(b.term))
    }));
}

function formatNullableGrade(value: number | null) {
  return value === null ? "Pendiente" : Number(value).toFixed(2);
}
