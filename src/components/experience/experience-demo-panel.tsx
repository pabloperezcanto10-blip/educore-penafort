"use client";

import { useState } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
import { GradebookBadge, GradebookCard, GradebookCardHeader, ProgressBar, StudentAvatar } from "@/components/grades/gradebook-design";
import { readExperienceStorage, resetExperienceStorage, writeExperienceStorage } from "@/lib/experience/demo-storage";
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
  { id: "lucia", name: "Lucía Romero", course: "6º Primaria A" },
  { id: "mateo", name: "Mateo Molina", course: "1º ESO" },
  { id: "sofia", name: "Sofía Vega", course: "6º Primaria A" }
];

const messages = [
  { id: "msg-1", from: "Familia Vega", subject: "Solicitud de reunión", detail: "Consulta sobre seguimiento académico de Sofía." },
  { id: "msg-2", from: "Irene Soler", subject: "Respuesta enviada", detail: "La tutora ha compartido un plan de refuerzo." }
];

export function ExperienceDemoPanel({ role, panel }: ExperienceDemoPanelProps) {
  const normalizedPanel = normalizePanel(role, panel);
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
      setFeedback("La comunicación ya estaba marcada como leída.");
      return;
    }

    updateState({ ...state, readMessages: [...state.readMessages, id] }, "Comunicación marcada como leída.");
  }

  function setAttendance(studentId: string, status: AttendanceStatus) {
    updateState(
      { ...state, attendance: { ...state.attendance, [studentId]: status } },
      "Asistencia actualizada en la Experience."
    );
  }

  function justifyAbsence(studentId: string) {
    if (state.justifiedAbsences.includes(studentId)) {
      setFeedback("La justificación ya estaba simulada.");
      return;
    }

    updateState(
      { ...state, justifiedAbsences: [...state.justifiedAbsences, studentId] },
      "Justificación simulada correctamente."
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
          reviewedItems={state.reviewedItems}
          readMessages={state.readMessages}
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
    <GradebookCard className="experience-fade-up mt-5">
      <GradebookCardHeader title="Acción demo">
        <div className="flex items-center gap-2">
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
  reviewedItems,
  readMessages,
  onMessageRead,
  onReviewed
}: {
  panel: string;
  reviewedItems: string[];
  readMessages: string[];
  onMessageRead: (id: string) => void;
  onReviewed: (id: string, message?: string) => void;
}) {
  if (panel === "communications" || panel === "comunicaciones") {
    return <MessagesPanel readMessages={readMessages} onMessageRead={onMessageRead} title="Comunicaciones del centro" />;
  }

  if (panel === "students" || panel === "alumnos" || panel === "attendance") {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {students.map((student) => (
          <StudentMiniCard key={student.id} student={student} action="Abrir seguimiento" onAction={() => onReviewed(`student-${student.id}`, "Seguimiento de alumno abierto en la Experience.")} />
        ))}
      </div>
    );
  }

  if (panel === "gradebook" || panel === "evaluacion") {
    return <AcademicDemoPanel onReviewed={() => onReviewed("academic-publication", "Publicación revisada en la Experience.")} reviewed={reviewedItems.includes("academic-publication")} />;
  }

  if (panel === "calendar" || panel === "calendario") {
    return <CalendarDemoPanel onReviewed={() => onReviewed("calendar-review", "Evento revisado en la Experience.")} reviewed={reviewedItems.includes("calendar-review")} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[
        ["priority-communication", "Comunicación dirigida a Dirección", "Familia Vega solicita una reunión de seguimiento."],
        ["priority-publication", "Publicación pendiente", "Boletín de 2º ESO listo para revisión."]
      ].map(([id, title, description]) => (
        <ReviewCard key={id} id={id} title={title} description={description} reviewed={reviewedItems.includes(id)} onReviewed={onReviewed} />
      ))}
    </div>
  );
}

function TutorPanel({
  panel,
  attendance,
  readMessages,
  onAttendanceChange,
  onMessageRead,
  onReviewed
}: {
  panel: string;
  attendance: Record<string, AttendanceStatus>;
  readMessages: string[];
  onAttendanceChange: (studentId: string, status: AttendanceStatus) => void;
  onMessageRead: (id: string) => void;
  onReviewed: (id: string, message?: string) => void;
}) {
  if (panel === "attendance" || panel === "asistencia" || panel === "pendientes") {
    return <AttendanceDemoPanel attendance={attendance} onAttendanceChange={onAttendanceChange} />;
  }

  if (panel === "communications" || panel === "comunicaciones") {
    return <MessagesPanel readMessages={readMessages} onMessageRead={onMessageRead} title="Comunicaciones del docente" />;
  }

  if (panel === "students" || panel === "alumnos") {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {students.map((student) => (
          <StudentMiniCard key={student.id} student={student} action="Ver ficha demo" onAction={() => onReviewed(`tutor-student-${student.id}`, "Ficha demo abierta.")} />
        ))}
      </div>
    );
  }

  if (panel === "gradebook" || panel === "cuaderno") {
    return <AcademicDemoPanel onReviewed={() => onReviewed("teacher-gradebook", "Cuaderno demo revisado.")} reviewed={false} />;
  }

  if (panel === "calendar" || panel === "calendario") {
    return <CalendarDemoPanel onReviewed={() => onReviewed("teacher-calendar", "Evento del docente revisado.")} reviewed={false} />;
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
    return <MessagesPanel readMessages={readMessages} onMessageRead={onMessageRead} title="Comunicaciones familiares" />;
  }

  if (panel === "gradebook" || panel === "grades") {
    return <FamilyGradesPanel />;
  }

  if (panel === "attendance") {
    return (
      <div className="space-y-3">
        <InfoHeader icon={ClipboardList} title="Asistencia de Lucía Romero" description="Resumen ficticio de retrasos y ausencias visibles para la familia." />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-950">Retraso pendiente de justificar</p>
          <p className="mt-1 text-sm text-slate-500">Entrada registrada a las 09:14.</p>
          <button
            type="button"
            onClick={() => onJustify("lucia")}
            className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {justifiedAbsences.includes("lucia") ? "Justificación enviada" : "Simular justificación"}
          </button>
        </div>
      </div>
    );
  }

  if (panel === "calendar") {
    return <CalendarDemoPanel onReviewed={() => undefined} reviewed={false} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
      <StudentMiniCard student={students[0]} action="Consultar perfil" onAction={() => undefined} />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-950">Boletín demo disponible</p>
        <p className="mt-1 text-sm text-slate-500">Calificaciones visibles, observaciones por materia y próximos eventos familiares.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric label="Notas visibles" value="3" />
          <Metric label="Asistencia" value="2 avisos" />
          <Metric label="Boletín" value="Disponible" />
        </div>
      </div>
    </div>
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
    <div className="space-y-3">
      <InfoHeader icon={ClipboardList} title="Pasar lista demo" description="Marca estados ficticios y comprueba cómo se actualiza el panel sin escribir en producción." />
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
                {readMessages.includes(message.id) ? "Leída" : "Sin leer"}
              </GradebookBadge>
            </div>
            <p className="mt-3 text-sm text-slate-600">{message.detail}</p>
            <button
              type="button"
              onClick={() => onMessageRead(message.id)}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Marcar como leída
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcademicDemoPanel({ reviewed, onReviewed }: { reviewed: boolean; onReviewed: () => void }) {
  return (
    <div className="space-y-3">
      <InfoHeader icon={BookOpenCheck} title="Supervisión académica demo" description="Resumen ficticio de progreso, criterios y publicación de boletines." />
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
        Revisar publicación
      </button>
    </div>
  );
}

function FamilyGradesPanel() {
  return (
    <div className="space-y-3">
      <InfoHeader icon={BookOpenCheck} title="Calificaciones visibles" description="Notas ficticias publicadas para la familia." />
      {[
        ["Matemáticas", "8,4", "Buen progreso en resolución de problemas."],
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
      <InfoHeader icon={CalendarDays} title="Calendario demo" description="Eventos ficticios del centro para comprobar navegación y seguimiento." />
      {["Reunión de coordinación", "Actividad de ciencias", "Publicación de boletines"].map((event, index) => (
        <div key={event} className="experience-card-motion flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">{event}</p>
            <p className="text-xs text-slate-500">{index === 0 ? "Hoy · 12:30" : `${index + 1} días`}</p>
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
          <p className="text-sm font-semibold text-slate-950">Corium AI se integrará como guía contextual.</p>
          <p className="mt-1 text-sm text-slate-500">
            En el siguiente sprint podrá explicar botones, resolver dudas frecuentes y acompañar cada recorrido sin llamadas reales a proveedores.
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
