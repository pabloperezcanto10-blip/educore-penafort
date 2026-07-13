"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Inbox,
  MessageSquareText,
  Send,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
import {
  CommunicationMessageBubble,
  CommunicationSummaryBadges,
  CommunicationWorkspace,
  ConversationContextGrid,
  ConversationListCard
} from "@/components/communications/communication-design";
import { GradebookBadge, GradebookCard, GradebookCardHeader, ProgressBar, StudentAvatar } from "@/components/grades/gradebook-design";
import { EvaluationCriteriaReadonly, GradebookReadonly, QuarterFinalGradesReadonly } from "@/components/grades/gradebook-readonly";
import {
  StudentActivityTimeline,
  StudentProfileHeader,
  StudentProfileTabs,
  StudentQuickActions,
  StudentStatusDashboard
} from "@/components/students/student-profile";
import { getExperienceModuleHref } from "@/components/experience/experience-data";
import { readExperienceStorage, resetExperienceStorage, writeExperienceStorage } from "@/lib/experience/demo-storage";
import type { EvaluationCriterionWithLabels, GradeTerm, GradeWithLabels, QuarterFinalGradeWithLabels } from "@/lib/grades/grades";
import type { ExperienceProfile } from "@/lib/experience/mode";

type ExperienceDemoPanelProps = {
  role: ExperienceProfile;
  panel?: string;
};

type AttendanceStatus = "present" | "absent" | "late";

type DemoPanelState = {
  reviewedItems: string[];
  readMessages: string[];
  attendance: Record<string, AttendanceStatus>;
  justifiedAbsences: string[];
};

const initialState: DemoPanelState = {
  reviewedItems: [],
  readMessages: [],
  attendance: {},
  justifiedAbsences: []
};

const students = [
  { id: "lucia", name: "LucÃ­a Romero", course: "6Âº Primaria A" },
  { id: "mateo", name: "Mateo Molina", course: "1Âº ESO" },
  { id: "sofia", name: "SofÃ­a Vega", course: "6Âº Primaria A" }
];

const messages = [
  { id: "msg-1", from: "Familia Vega", subject: "Solicitud de reuniÃ³n", detail: "Consulta sobre seguimiento acadÃ©mico de SofÃ­a." },
  { id: "msg-2", from: "Irene Soler", subject: "Respuesta enviada", detail: "La tutora ha compartido un plan de refuerzo." }
];

const demoGrades: GradeWithLabels[] = [
  createDemoGrade("grade-1", "LucÃ­a Romero", "MatemÃ¡ticas", "ResoluciÃ³n de problemas", 8.4, "Buen progreso en estrategias de cÃ¡lculo."),
  createDemoGrade("grade-2", "LucÃ­a Romero", "Ciencias", "Proyecto de ecosistemas", 9.1, "Trabajo muy completo y bien presentado."),
  createDemoGrade("grade-3", "Mateo Molina", "Lengua", "ComprensiÃ³n lectora", 7.8, "Conviene reforzar inferencias.")
];

const demoCriteria: EvaluationCriterionWithLabels[] = [
  createDemoCriterion("criterion-1", "MatemÃ¡ticas", "6Âº Primaria A", "ResoluciÃ³n de problemas", 40, "parcial"),
  createDemoCriterion("criterion-2", "MatemÃ¡ticas", "6Âº Primaria A", "CÃ¡lculo mental", 30, "parcial"),
  createDemoCriterion("criterion-3", "Ciencias", "6Âº Primaria A", "Proyecto de ecosistemas", 30, "proyecto")
];

const demoFinalGrades: QuarterFinalGradeWithLabels[] = [
  {
    id: "final-1",
    student_id: "lucia",
    subject_id: "math",
    teacher_id: "irene",
    course_id: "course-6a",
    term: "2",
    calculated_grade: 8.4,
    final_grade: 8,
    teacher_observation: "Buen trimestre. Mantiene una evoluciÃ³n positiva.",
    created_at: new Date().toISOString(),
    studentName: "LucÃ­a Romero",
    subjectName: "MatemÃ¡ticas",
    courseName: "6Âº Primaria A",
    teacherName: "Irene Soler"
  }
];

export function ExperienceDemoPanel({ role, panel }: ExperienceDemoPanelProps) {
  const normalizedPanel = normalizePanel(role, panel);
  const panelHref = getExperienceModuleHref(role, "panel");
  const [state, setState] = useState<DemoPanelState>(() => readExperienceStorage<DemoPanelState>(role) ?? initialState);
  const [feedback, setFeedback] = useState<string | null>(null);

  function updateState(nextState: DemoPanelState, message: string) {
    setState(nextState);
    writeExperienceStorage(role, nextState);
    setFeedback(message);
  }

  function markReviewed(id: string, message = "Prioridad revisada en la Experience.") {
    if (state.reviewedItems.includes(id)) {
      setFeedback("Este elemento ya estaba revisado en la Experience.");
      return;
    }

    updateState({ ...state, reviewedItems: [...state.reviewedItems, id] }, message);
  }

  function markMessageRead(id: string) {
    if (state.readMessages.includes(id)) {
      setFeedback("La comunicaciÃ³n ya estaba marcada como leÃ­da.");
      return;
    }

    updateState({ ...state, readMessages: [...state.readMessages, id] }, "ComunicaciÃ³n marcada como leÃ­da.");
  }

  function setAttendance(studentId: string, status: AttendanceStatus) {
    updateState(
      { ...state, attendance: { ...state.attendance, [studentId]: status } },
      "Asistencia actualizada en la Experience."
    );
  }

  function justifyAbsence(studentId: string) {
    if (state.justifiedAbsences.includes(studentId)) {
      setFeedback("La justificaciÃ³n ya estaba simulada.");
      return;
    }

    updateState(
      { ...state, justifiedAbsences: [...state.justifiedAbsences, studentId] },
      "JustificaciÃ³n simulada correctamente."
    );
  }

  function resetPanel() {
    resetExperienceStorage(role);
    setState(initialState);
    setFeedback("Panel restablecido en la Experience.");
  }

  const content = (() => {
    if (normalizedPanel === "corium") {
      return <CoriumPreparationPanel />;
    }

  if (role === "director") {
      return (
        <DirectorPanel
          panel={normalizedPanel}
          attendance={state.attendance}
          reviewedItems={state.reviewedItems}
          readMessages={state.readMessages}
          onAttendanceChange={setAttendance}
          onMessageRead={markMessageRead}
          onReviewed={markReviewed}
        />
      );
    }

    if (role === "docente") {
      return (
        <TutorPanel
          panel={normalizedPanel}
          attendance={state.attendance}
          reviewedItems={state.reviewedItems}
          readMessages={state.readMessages}
          onAttendanceChange={setAttendance}
          onMessageRead={markMessageRead}
          onReviewed={markReviewed}
        />
      );
    }

    return (
      <FamilyPanel
        panel={normalizedPanel}
        justifiedAbsences={state.justifiedAbsences}
        readMessages={state.readMessages}
        onJustify={justifyAbsence}
        onMessageRead={markMessageRead}
      />
    );
  })();

  return (
    <div id="experience-demo-panel" data-experience-target="demo-panel" className="experience-target-panel scroll-mt-4">
    <GradebookCard className="experience-fade-up mt-5">
      <GradebookCardHeader title="AcciÃ³n demo">
        <div className="flex items-center gap-2">
          {panel ? (
            <Link
              href={panelHref}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Volver al panel
            </Link>
          ) : null}
          <GradebookBadge tone="green">Interactiva</GradebookBadge>
          <button
            type="button"
            onClick={resetPanel}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Restablecer panel
          </button>
        </div>
      </GradebookCardHeader>
      <div className="space-y-4 p-4">
        {feedback ? (
          <div className="experience-feedback-in rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" role="status">
            {feedback}
          </div>
        ) : null}
        {content}
      </div>
    </GradebookCard>
    </div>
  );
}

function normalizePanel(role: ExperienceProfile, panel?: string) {
  if (panel) return panel;
  if (role === "director") return "prioridades";
  if (role === "docente") return "attendance";
  return "student";
}

function DirectorPanel({
  panel,
  attendance,
  reviewedItems,
  readMessages,
  onAttendanceChange,
  onMessageRead,
  onReviewed
}: {
  panel: string;
  attendance: Record<string, AttendanceStatus>;
  reviewedItems: string[];
  readMessages: string[];
  onAttendanceChange: (studentId: string, status: AttendanceStatus) => void;
  onMessageRead: (id: string) => void;
  onReviewed: (id: string, message?: string) => void;
}) {
  if (panel === "communications" || panel === "comunicaciones") {
    return <ExperienceCommunicationsModule readMessages={readMessages} onMessageRead={onMessageRead} title="Comunicaciones del centro" />;
  }

  if (panel === "students" || panel === "alumnos") {
    return <ExperienceStudentProfileModule role="director" onReviewed={() => onReviewed("student-profile", "Ficha del alumno abierta en la Experience.")} />;
  }

  if (panel === "attendance") {
    return <AttendanceDemoPanel attendance={attendance} onAttendanceChange={onAttendanceChange} />;
  }

  if (panel === "gradebook" || panel === "evaluacion") {
    return <ExperienceGradebookModule onReviewed={() => onReviewed("academic-publication", "PublicaciÃ³n revisada en la Experience.")} reviewed={reviewedItems.includes("academic-publication")} />;
  }

  if (panel === "calendar" || panel === "calendario") {
    return <ExperienceCalendarModule onReviewed={() => onReviewed("calendar-review", "Evento revisado en la Experience.")} reviewed={reviewedItems.includes("calendar-review")} />;
  }

  return (
    <div data-experience-target="director-supervision-summary" className="grid gap-3 md:grid-cols-2">
      {[
        ["priority-communication", "ComunicaciÃ³n dirigida a DirecciÃ³n", "Familia Vega solicita una reuniÃ³n de seguimiento."],
        ["priority-publication", "PublicaciÃ³n pendiente", "BoletÃ­n de 2Âº ESO listo para revisiÃ³n."]
      ].map(([id, title, description]) => (
        <ReviewCard key={id} id={id} title={title} description={description} reviewed={reviewedItems.includes(id)} onReviewed={onReviewed} />
      ))}
    </div>
  );
}

function TutorPanel({
  panel,
  attendance,
  reviewedItems,
  readMessages,
  onAttendanceChange,
  onMessageRead,
  onReviewed
}: {
  panel: string;
  attendance: Record<string, AttendanceStatus>;
  reviewedItems: string[];
  readMessages: string[];
  onAttendanceChange: (studentId: string, status: AttendanceStatus) => void;
  onMessageRead: (id: string) => void;
  onReviewed: (id: string, message?: string) => void;
}) {
  if (panel === "attendance" || panel === "asistencia" || panel === "pendientes") {
    return <AttendanceDemoPanel attendance={attendance} onAttendanceChange={onAttendanceChange} />;
  }

  if (panel === "communications" || panel === "comunicaciones") {
    return <ExperienceCommunicationsModule readMessages={readMessages} onMessageRead={onMessageRead} title="Comunicaciones del docente" />;
  }

  if (panel === "students" || panel === "alumnos") {
    return <ExperienceStudentProfileModule role="docente" onReviewed={() => onReviewed("tutor-student-profile", "Ficha demo abierta.")} />;
  }

  if (panel === "gradebook" || panel === "cuaderno") {
    return <ExperienceGradebookModule onReviewed={() => onReviewed("teacher-gradebook", "Cuaderno demo revisado.")} reviewed={reviewedItems.includes("teacher-gradebook")} />;
  }

  if (panel === "calendar" || panel === "calendario") {
    return <ExperienceCalendarModule onReviewed={() => onReviewed("teacher-calendar", "Evento del docente revisado.")} reviewed={reviewedItems.includes("teacher-calendar")} />;
  }

  return <AttendanceDemoPanel attendance={attendance} onAttendanceChange={onAttendanceChange} />;
}

function FamilyPanel({
  panel,
  justifiedAbsences,
  readMessages,
  onJustify,
  onMessageRead
}: {
  panel: string;
  justifiedAbsences: string[];
  readMessages: string[];
  onJustify: (studentId: string) => void;
  onMessageRead: (id: string) => void;
}) {
  if (panel === "communications") {
    return <ExperienceCommunicationsModule readMessages={readMessages} onMessageRead={onMessageRead} title="Comunicaciones familiares" />;
  }

  if (panel === "gradebook" || panel === "grades") {
    return <FamilyGradesPanel />;
  }

  if (panel === "attendance") {
    return (
      <div data-experience-target="attendance-family-summary" className="space-y-3">
        <InfoHeader icon={ClipboardList} title="Asistencia de LucÃ­a Romero" description="Resumen ficticio de retrasos y ausencias visibles para la familia." />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-950">Retraso pendiente de justificar</p>
          <p className="mt-1 text-sm text-slate-500">Entrada registrada a las 09:14.</p>
          <button
            type="button"
            onClick={() => onJustify("lucia")}
            className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {justifiedAbsences.includes("lucia") ? "JustificaciÃ³n enviada" : "Simular justificaciÃ³n"}
          </button>
        </div>
      </div>
    );
  }

  if (panel === "calendar") {
    return <ExperienceCalendarModule onReviewed={() => undefined} reviewed={false} />;
  }

  return (
    <ExperienceStudentProfileModule role="familia" onReviewed={() => undefined} readOnly />
  );
}

function AttendanceDemoPanel({
  attendance,
  onAttendanceChange
}: {
  attendance: Record<string, AttendanceStatus>;
  onAttendanceChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  return (
    <div data-experience-target="attendance-primary-action" className="space-y-3">
      <InfoHeader icon={ClipboardList} title="Pasar lista demo" description="Marca estados ficticios y comprueba cÃ³mo se actualiza el panel sin escribir en producciÃ³n." />
      <div className="space-y-2">
        {students.map((student) => {
          const status = attendance[student.id] ?? "present";
          return (
            <div key={student.id} className="experience-card-motion flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <StudentAvatar name={student.name} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.course}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["present", "absent", "late"] as AttendanceStatus[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onAttendanceChange(student.id, option)}
                    className={`h-8 rounded-lg px-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      status === option ? statusClass(option) : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {statusLabel(option)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessagesPanel({
  title,
  readMessages,
  onMessageRead
}: {
  title: string;
  readMessages: string[];
  onMessageRead: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <InfoHeader icon={MessageSquareText} title={title} description="Lee conversaciones ficticias y simula acciones sin enviar mensajes reales." />
      <div className="grid gap-3 md:grid-cols-2">
        {messages.map((message) => (
          <div key={message.id} className="experience-card-motion rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{message.subject}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{message.from}</p>
              </div>
              <GradebookBadge tone={readMessages.includes(message.id) ? "green" : "amber"}>
                {readMessages.includes(message.id) ? "LeÃ­da" : "Sin leer"}
              </GradebookBadge>
            </div>
            <p className="mt-3 text-sm text-slate-600">{message.detail}</p>
            <button
              type="button"
              onClick={() => onMessageRead(message.id)}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Marcar como leÃ­da
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExperienceCommunicationsModule({
  title,
  readMessages,
  onMessageRead
}: {
  title: string;
  readMessages: string[];
  onMessageRead: (id: string) => void;
}) {
  const activeMessage = messages[0];

  return (
    <div data-experience-target="communications-overview" className="space-y-4">
      <InfoHeader icon={MessageSquareText} title={title} description="Vista real de comunicaciÃ³n reutilizada con conversaciones ficticias y respuestas simuladas." />
      <CommunicationSummaryBadges
        items={[
          { label: "Abiertas", value: 2, tone: "blue" },
          { label: "Sin leer", value: messages.filter((message) => !readMessages.includes(message.id)).length, tone: "amber" },
          { label: "Respuestas", value: 1, tone: "green" }
        ]}
      />
      <CommunicationWorkspace>
        <aside className="space-y-2 border-b border-slate-200 bg-slate-50 p-3 xl:border-b-0 xl:border-r">
          {messages.map((message, index) => (
            <ConversationListCard
              key={message.id}
              href="#experience-conversation"
              active={index === 0}
              title={message.from}
              subtitle={message.subject}
              date={index === 0 ? "Hoy Â· 09:40" : "Ayer Â· 18:20"}
              preview={message.detail}
              unreadCount={readMessages.includes(message.id) ? 0 : 1}
              badges={[
                { label: "Familia", tone: "blue" },
                { label: index === 0 ? "Abierta" : "Respondida", tone: index === 0 ? "amber" : "green" }
              ]}
            />
          ))}
        </aside>
        <section id="experience-conversation" className="flex flex-col">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">{activeMessage.subject}</p>
                <p className="mt-1 text-sm text-slate-500">{activeMessage.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => onMessageRead(activeMessage.id)}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {readMessages.includes(activeMessage.id) ? "LeÃ­da" : "Marcar como leÃ­da"}
              </button>
            </div>
            <ConversationContextGrid
              items={[
                { label: "Alumno", value: "SofÃ­a Vega" },
                { label: "Curso", value: "6Âº Primaria A" },
                { label: "Tutor", value: "Irene Soler" },
                { label: "CategorÃ­a", value: "Seguimiento" }
              ]}
            />
          </div>
          <div className="flex-1 space-y-3 bg-white p-4">
            <CommunicationMessageBubble
              title="Familia Vega"
              meta="Hoy Â· 09:40"
              message="Nos gustarÃ­a revisar el seguimiento acadÃ©mico de SofÃ­a y coordinar una reuniÃ³n breve."
              badges={[{ label: "Recibida", tone: readMessages.includes(activeMessage.id) ? "green" : "amber" }]}
            />
            <CommunicationMessageBubble
              sent
              title="Irene Soler"
              meta="Hoy Â· 10:05"
              message="Gracias por escribir. He preparado un plan de refuerzo y podemos comentarlo esta semana."
              badges={[{ label: "Respuesta simulada", tone: "blue" }]}
            />
          </div>
        </section>
      </CommunicationWorkspace>
    </div>
  );
}

function ExperienceStudentProfileModule({ role, onReviewed, readOnly = false }: { role: ExperienceProfile; onReviewed: () => void; readOnly?: boolean }) {
  const communicationsHref = getExperienceModuleHref(role, "communications");
  const gradebookHref = getExperienceModuleHref(role, "gradebook");
  const studentHref = getExperienceModuleHref(role, "students");
  const panelHref = getExperienceModuleHref(role, "panel");
  const tabs = [
    { id: "resumen", label: "Resumen", href: studentHref, icon: UserRound },
    { id: "calificaciones", label: "Calificaciones", href: gradebookHref, icon: BookOpenCheck },
    { id: "comunicacion", label: "ComunicaciÃ³n", href: communicationsHref, icon: MessageSquareText }
  ];

  return (
    <div id="experience-student-profile" data-experience-target="student-profile-summary" className="space-y-4">
      <StudentProfileHeader
        backHref={panelHref}
        backLabel="Volver al panel"
        studentName="LucÃ­a Romero"
        courseName="6Âº Primaria A"
        tutorName="Irene Soler"
        active
      />
      {!readOnly ? (
        <StudentQuickActions
          actions={[
            { label: "Comunicar", href: communicationsHref, icon: Send, primary: true },
            { label: "Abrir cuaderno", href: gradebookHref, icon: BookOpenCheck }
          ]}
        />
      ) : null}
      <StudentProfileTabs tabs={tabs} activeTab="resumen" />
      <StudentStatusDashboard
        averageGrade="8,4"
        latestGrade="9,1"
        latestGradeMeta="Ciencias Â· Proyecto de ecosistemas"
        progressCompleted={5}
        progressTotal={6}
        progressPercent={83}
        attendanceValue="2"
        attendanceHint="Avisos del trimestre"
        attendanceTone="amber"
        incidents={1}
        observations={2}
        communications={3}
      />
      <StudentActivityTimeline
        items={[
          { id: "activity-1", title: "CalificaciÃ³n registrada", meta: "Ciencias Â· Proyecto de ecosistemas", date: new Date().toISOString(), tone: "green", kind: "grade" },
          { id: "activity-2", title: "ComunicaciÃ³n familiar", meta: "Solicitud de reuniÃ³n de seguimiento", date: new Date(Date.now() - 86400000).toISOString(), tone: "blue", kind: "communication" },
          { id: "activity-3", title: "ObservaciÃ³n interna", meta: "Buen progreso en matemÃ¡ticas", date: new Date(Date.now() - 172800000).toISOString(), tone: "amber", kind: "observation" }
        ]}
        empty="Sin movimientos recientes registrados."
      />
      <button
        type="button"
        onClick={onReviewed}
        className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        Marcar ficha como revisada
      </button>
    </div>
  );
}

function ExperienceGradebookModule({ reviewed, onReviewed }: { reviewed: boolean; onReviewed: () => void }) {
  return (
    <div id="experience-gradebook" data-experience-target="gradebook-overview" className="space-y-4">
      <InfoHeader icon={BookOpenCheck} title="Cuaderno de Calificaciones" description="Componentes reales del cuaderno en modo lectura, alimentados con datos ficticios." />
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Criterios completados" value="82%" />
        <Metric label="Materias abiertas" value="5" />
        <Metric label="Publicaciones" value={reviewed ? "Revisada" : "Pendiente"} />
      </div>
      <ProgressBar value={82} />
      <GradebookReadonly grades={demoGrades} />
      <EvaluationCriteriaReadonly criteria={demoCriteria} />
      <QuarterFinalGradesReadonly finalGrades={demoFinalGrades} />
      <button
        type="button"
        onClick={onReviewed}
        className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        Revisar publicaciÃ³n
      </button>
    </div>
  );
}

function ExperienceCalendarModule({ reviewed, onReviewed }: { reviewed: boolean; onReviewed: () => void }) {
  return (
    <div data-experience-target="calendar-overview" className="space-y-3">
      <InfoHeader icon={CalendarDays} title="Calendario Experience" description="Agenda navegable con eventos ficticios. No sincroniza Google Calendar ni escribe datos reales." />
      <div className="grid gap-3 md:grid-cols-3">
        {["ReuniÃ³n de coordinaciÃ³n", "Actividad de ciencias", "PublicaciÃ³n de boletines"].map((event, index) => (
          <div key={event} className="experience-card-motion rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">{event}</p>
            <p className="mt-1 text-xs text-slate-500">{index === 0 ? "Hoy Â· 12:30" : `${index + 1} dÃ­as`}</p>
            <GradebookBadge tone={reviewed ? "green" : "blue"}>{reviewed ? "Revisado" : "Programado"}</GradebookBadge>
          </div>
        ))}
      </div>
      <button type="button" onClick={onReviewed} className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500">
        Revisar evento
      </button>
    </div>
  );
}

function AcademicDemoPanel({ reviewed, onReviewed }: { reviewed: boolean; onReviewed: () => void }) {
  return (
    <div className="space-y-3">
      <InfoHeader icon={BookOpenCheck} title="SupervisiÃ³n acadÃ©mica demo" description="Resumen ficticio de progreso, criterios y publicaciÃ³n de boletines." />
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Criterios completados" value="82%" />
        <Metric label="Materias abiertas" value="5" />
        <Metric label="Publicaciones" value={reviewed ? "Revisada" : "Pendiente"} />
      </div>
      <ProgressBar value={82} />
      <button
        type="button"
        onClick={onReviewed}
        className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        Revisar publicaciÃ³n
      </button>
    </div>
  );
}

function FamilyGradesPanel() {
  return (
    <div data-experience-target="family-grades-summary" className="space-y-3">
      <InfoHeader icon={BookOpenCheck} title="Calificaciones visibles" description="Notas ficticias publicadas para la familia." />
      {[
        ["MatemÃ¡ticas", "8,4", "Buen progreso en resoluciÃ³n de problemas."],
        ["Ciencias", "9,1", "Proyecto de ecosistemas muy completo."],
        ["Lengua", "7,8", "Conviene reforzar inferencias lectoras."]
      ].map(([subject, grade, comment]) => (
        <div key={subject} className="experience-card-motion grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_90px_1.4fr]">
          <p className="text-sm font-semibold text-slate-950">{subject}</p>
          <p className="text-sm font-bold text-sky-700">{grade}</p>
          <p className="text-sm text-slate-600">{comment}</p>
        </div>
      ))}
    </div>
  );
}

function CalendarDemoPanel({ reviewed, onReviewed }: { reviewed: boolean; onReviewed: () => void }) {
  return (
    <div className="space-y-3">
      <InfoHeader icon={CalendarDays} title="Calendario demo" description="Eventos ficticios del centro para comprobar navegaciÃ³n y seguimiento." />
      {["ReuniÃ³n de coordinaciÃ³n", "Actividad de ciencias", "PublicaciÃ³n de boletines"].map((event, index) => (
        <div key={event} className="experience-card-motion flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">{event}</p>
            <p className="text-xs text-slate-500">{index === 0 ? "Hoy Â· 12:30" : `${index + 1} dÃ­as`}</p>
          </div>
          <GradebookBadge tone={reviewed ? "green" : "blue"}>{reviewed ? "Revisado" : "Programado"}</GradebookBadge>
        </div>
      ))}
      <button type="button" onClick={onReviewed} className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500">
        Revisar evento
      </button>
    </div>
  );
}

function CoriumPreparationPanel() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-950">Corium AI estÃ¡ disponible como guÃ­a contextual.</p>
          <p className="mt-1 text-sm text-slate-500">
            Usa el botÃ³n flotante o la opciÃ³n â€œGuÃ­a de Coriumâ€ para pedir orientaciÃ³n, iniciar el recorrido guiado o hacer una pregunta basada en FAQs.
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentMiniCard({
  student,
  action,
  onAction
}: {
  student: { id: string; name: string; course: string };
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="experience-card-motion rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <StudentAvatar name={student.name} />
        <div>
          <p className="text-sm font-semibold text-slate-950">{student.name}</p>
          <p className="text-xs text-slate-500">{student.course}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {action}
      </button>
    </div>
  );
}

function ReviewCard({
  id,
  title,
  description,
  reviewed,
  onReviewed
}: {
  id: string;
  title: string;
  description: string;
  reviewed: boolean;
  onReviewed: (id: string) => void;
}) {
  return (
    <div className={`experience-card-motion rounded-xl border p-4 transition ${reviewed ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <GradebookBadge tone={reviewed ? "green" : "amber"}>{reviewed ? "Revisada" : "Pendiente"}</GradebookBadge>
      </div>
      <button
        type="button"
        onClick={() => onReviewed(id)}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        Marcar como revisada
      </button>
    </div>
  );
}

function InfoHeader({
  icon: Icon,
  title,
  description
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="experience-card-motion rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function createDemoGrade(id: string, studentName: string, subjectName: string, assessmentName: string, grade: number, comment: string): GradeWithLabels {
  return {
    id,
    student_id: studentName.toLowerCase().replace(/\s+/g, "-"),
    teacher_id: "irene",
    subject_id: subjectName.toLowerCase(),
    course_id: "course-6a",
    term: "2" satisfies GradeTerm,
    assessment_type: "parcial",
    assessment_name: assessmentName,
    grade,
    assessment_date: new Date().toISOString(),
    comment,
    recommendation: "Mantener el seguimiento semanal y revisar la organizaciÃ³n del trabajo.",
    visible_to_family: true,
    created_at: new Date().toISOString(),
    studentName,
    subjectName,
    teacherName: "Irene Soler"
  };
}

function createDemoCriterion(
  id: string,
  subjectName: string,
  courseName: string,
  name: string,
  weight: number,
  criterionType: EvaluationCriterionWithLabels["criterion_type"]
): EvaluationCriterionWithLabels {
  return {
    id,
    teacher_id: "irene",
    course_id: "course-6a",
    subject_id: subjectName.toLowerCase(),
    term: "2",
    name,
    weight,
    criterion_type: criterionType,
    visible_to_family: true,
    active: true,
    created_at: new Date().toISOString(),
    subjectName,
    courseName,
    teacherName: "Irene Soler"
  };
}

function statusLabel(status: AttendanceStatus) {
  return {
    present: "Presente",
    absent: "Ausente",
    late: "Retraso"
  }[status];
}

function statusClass(status: AttendanceStatus) {
  return {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-red-100 text-red-700",
    late: "bg-amber-100 text-amber-800"
  }[status];
}



