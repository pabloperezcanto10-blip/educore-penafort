import Link from "next/link";
import { CheckCheck, Inbox, MessageSquareReply, Search, Send } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getFamilyCommunications,
  getFamilyStudentContacts,
  type FamilyCommunication
} from "@/lib/communications/notifications";
import { getFamilyAttendance, type FamilyAttendanceRow } from "@/lib/attendance/attendance";
import {
  closeFamilyConversation,
  justifyAttendanceFromCommunication,
  markFamilyConversationRead,
  reopenFamilyConversation,
  replyToFamilyCommunication,
  sendFamilyCommunication
} from "../actions";

type PageProps = {
  searchParams?: {
    c?: string;
    q?: string;
    student_id?: string;
    participant_id?: string;
    category?: string;
    status?: string;
    conversation_status?: string;
    direction?: string;
  };
};

type FamilyConversation = {
  id: string;
  subject: string;
  messages: FamilyCommunication[];
  latest: FamilyCommunication;
  unreadCount: number;
  isClosed: boolean;
  ids: string[];
};

export default async function FamilyCommunicationsPage({ searchParams = {} }: PageProps) {
  const profile = await requireRole("family");
  const [
    { communications, errorMessage },
    { students, directors, teachers, errorMessage: contactsError },
    { rows: attendanceRows, errorMessage: attendanceError }
  ] = await Promise.all([
    getFamilyCommunications(profile.id, {
      studentId: searchParams.student_id,
      participantId: searchParams.participant_id,
      category: searchParams.category,
      status: searchParams.status,
      direction: searchParams.direction
    }),
    getFamilyStudentContacts(profile.id),
    getFamilyAttendance(profile.id)
  ]);
  const participants = Array.from(
    new Map(communications.map((communication) => [communication.counterpartId, communication.counterpartName])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], "es"));
  const sentCount = communications.filter((communication) => communication.direction === "sent").length;
  const receivedCount = communications.filter((communication) => communication.direction === "received").length;
  const unreadCount = communications.filter((communication) => !communication.read).length;
  const conversations = filterFamilyConversations(buildFamilyConversations(communications), searchParams);
  const selectedConversation = conversations.find((conversation) => conversation.id === searchParams.c) ?? null;
  const attendanceByStudent = new Map(
    attendanceRows
      .filter((row) => row.status !== "present" && !row.justified)
      .map((row) => [row.student_id, row])
  );
  const pageError = errorMessage ?? contactsError ?? attendanceError;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Comunicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bandeja familiar para mensajes del centro, respuestas y justificaciones.
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
          No se pudo cargar la bandeja: {pageError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Recibidos" value={String(receivedCount)} />
        <MetricCard label="Enviados" value={String(sentCount)} />
        <MetricCard label="No leidos" value={String(unreadCount)} />
      </div>

      <details className="rounded-lg border border-border bg-white p-5">
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Send className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-semibold text-foreground">+ Nueva comunicacion</span>
            <span className="mt-1 block text-sm text-muted-foreground">Enviar mensaje a direccion o profesorado del centro.</span>
          </span>
        </summary>
        <ComposeCard students={students} directors={directors} teachers={teachers} />
      </details>

      <FilterForm
        students={students}
        participants={participants}
        searchParams={searchParams}
      />

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay comunicaciones para los filtros seleccionados.
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === selectedConversation?.id}
                searchParams={searchParams}
              />
            ))}
          </div>
          <ConversationDetail
            conversation={selectedConversation}
            attendance={selectedConversation?.latest.student_id ? attendanceByStudent.get(selectedConversation.latest.student_id) : undefined}
          />
        </section>
      )}
    </section>
  );
}

function ComposeCard({
  students,
  directors,
  teachers
}: {
  students: Awaited<ReturnType<typeof getFamilyStudentContacts>>["students"];
  directors: Awaited<ReturnType<typeof getFamilyStudentContacts>>["directors"];
  teachers: Awaited<ReturnType<typeof getFamilyStudentContacts>>["teachers"];
}) {
  return (
    <section className="mt-4 border-t border-border pt-4">
      <form action={sendFamilyCommunication} className="grid gap-3 lg:grid-cols-2">
        <Select
          name="student_id"
          label="Alumno relacionado opcional"
          value=""
          options={students.map((student) => ({
            value: student.id,
            label: `${student.name} ${student.last_name} · ${student.courseName}`
          }))}
        />
        <Select
          name="receiver_id"
          label="Destinatario"
          value=""
          options={[
            ...directors.map((director) => ({
              value: director.id,
              label: `Direccion: ${director.full_name ?? director.email ?? director.id}`
            })),
            ...teachers.map((teacher) => ({
              value: teacher.id,
              label: `Docente: ${teacher.full_name ?? teacher.email ?? teacher.id}`
            }))
          ]}
        />
        <Select
          name="category"
          label="Categoria"
          value="general"
          options={[
            { value: "general", label: "General" },
            { value: "incidencia", label: "Incidencia" },
            { value: "académico", label: "Academico" },
            { value: "tutoría", label: "Tutoria" }
          ]}
        />
        <label className="space-y-2">
          <span className="block text-sm font-medium text-foreground">Titulo</span>
          <input
            name="title"
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <label className="space-y-2 lg:col-span-2">
          <span className="block text-sm font-medium text-foreground">Mensaje</span>
          <textarea
            name="message"
            rows={3}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <button className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
          <Send className="h-4 w-4" aria-hidden="true" />
          Enviar mensaje
        </button>
      </form>
    </section>
  );
}

function FilterForm({
  students,
  participants,
  searchParams
}: {
  students: Awaited<ReturnType<typeof getFamilyStudentContacts>>["students"];
  participants: [string, string][];
  searchParams: PageProps["searchParams"];
}) {
  return (
    <form className="grid gap-3 rounded-lg border border-border bg-white p-5 lg:grid-cols-6">
      <label className="space-y-2 lg:col-span-2">
        <span className="block text-sm font-medium text-foreground">Buscar</span>
        <input
          name="q"
          defaultValue={searchParams?.q ?? ""}
          placeholder="Familia, alumno o asunto"
          className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>
      <Select
        name="direction"
        label="Bandeja"
        value={searchParams?.direction ?? ""}
        options={[
          { value: "received", label: "Recibidos" },
          { value: "sent", label: "Enviados" }
        ]}
      />
      <Select
        name="student_id"
        label="Hijo/alumno"
        value={searchParams?.student_id ?? ""}
        options={students.map((student) => ({
          value: student.id,
          label: `${student.name} ${student.last_name}`
        }))}
      />
      <Select
        name="participant_id"
        label="Profesor/direccion"
        value={searchParams?.participant_id ?? ""}
        options={participants.map(([value, label]) => ({ value, label }))}
      />
      <Select
        name="category"
        label="Tipo"
        value={searchParams?.category ?? ""}
        options={[
          { value: "general", label: "Aviso general" },
          { value: "incidencia", label: "Incidencia" },
          { value: "académico", label: "Calificacion / academico" },
          { value: "tutoría", label: "Tutor / direccion" }
        ]}
      />
      <Select
        name="status"
        label="Estado"
        value={searchParams?.status ?? ""}
        options={[
          { value: "unread", label: "No leidos" },
          { value: "read", label: "Leidos" }
        ]}
      />
      <Select
        name="conversation_status"
        label="Conversacion"
        value={searchParams?.conversation_status ?? ""}
        options={[
          { value: "open", label: "Abiertas" },
          { value: "closed", label: "Cerradas" }
        ]}
      />
      <div className="flex items-end gap-2">
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
          <Search className="h-4 w-4" aria-hidden="true" />
          Filtrar
        </button>
        <Link href="/dashboard/family/communications" className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function ConversationListItem({
  conversation,
  active,
  searchParams
}: {
  conversation: FamilyConversation;
  active: boolean;
  searchParams: PageProps["searchParams"];
}) {
  const latest = conversation.latest;
  const href = hrefWith(searchParams, { c: conversation.id });

  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 transition ${
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-muted"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-sm ${conversation.unreadCount > 0 ? "font-bold" : "font-semibold"} text-foreground`}>
            {latest.counterpartName}
          </p>
          <p className={`mt-1 truncate text-sm ${conversation.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            {conversation.subject}
          </p>
        </div>
        <time className="shrink-0 text-xs text-muted-foreground">{formatShortDate(latest.created_at)}</time>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{latest.message}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{latest.category}</Badge>
        {latest.studentName !== "Sin alumno" ? <Badge>{latest.studentName}</Badge> : null}
        {latest.courseName !== "Sin curso" ? <Badge>{latest.courseName}</Badge> : null}
        <Badge>{conversation.messages.length} mensajes</Badge>
        <Badge>{conversation.isClosed ? "Cerrada" : "Abierta"}</Badge>
        {conversation.unreadCount > 0 ? <Badge>{conversation.unreadCount} no leidos</Badge> : <Badge>Leida</Badge>}
      </div>
    </Link>
  );
}

function ConversationDetail({
  conversation,
  attendance
}: {
  conversation: FamilyConversation | null;
  attendance?: FamilyAttendanceRow;
}) {
  if (!conversation) {
    return (
      <main className="rounded-lg border border-dashed border-border bg-white p-8 text-center">
        <Inbox className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Selecciona una conversacion</h2>
        <p className="mt-1 text-sm text-muted-foreground">La bandeja muestra hilos compactos. Abre uno para leer y responder.</p>
      </main>
    );
  }

  const latest = conversation.latest;
  const sortedMessages = [...conversation.messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const unreadReceivedIds = conversation.messages
    .filter((message) => message.direction === "received" && !message.read)
    .map((message) => message.id);

  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
            <Badge>{latest.category}</Badge>
            <Badge>{latest.courseName}</Badge>
            <Badge>{conversation.unreadCount > 0 ? `${conversation.unreadCount} sin leer` : "Leida"}</Badge>
            <Badge>{conversation.isClosed ? "Cerrada" : "Abierta"}</Badge>
            <Badge>{conversation.messages.length} mensajes</Badge>
          </div>
          <h2 className="mt-3 text-base font-semibold text-foreground">{conversation.subject}</h2>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{latest.message}</p>
          <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p>Interlocutor: {latest.counterpartName}</p>
            <p>Alumno: {latest.studentName}</p>
            <p>Curso: {latest.courseName}</p>
            <p>Ultima respuesta: {formatDate(latest.created_at)}</p>
          </div>
        </div>
        {unreadReceivedIds.length === 0 ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground">
            Sin pendientes
          </span>
        ) : (
          <form action={markFamilyConversationRead}>
            <input type="hidden" name="communication_ids" value={unreadReceivedIds.join(",")} />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Marcar como leido
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {conversation.isClosed ? (
          <form action={reopenFamilyConversation}>
            <input type="hidden" name="communication_ids" value={conversation.ids.join(",")} />
            <button className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
              Reabrir conversacion
            </button>
          </form>
        ) : (
          <form action={closeFamilyConversation}>
            <input type="hidden" name="communication_ids" value={conversation.ids.join(",")} />
            <button className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-muted">
              Cerrar conversacion
            </button>
          </form>
        )}
      </div>

      <div className="mt-5 space-y-3 rounded-md bg-background p-3">
        {sortedMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {conversation.isClosed ? (
        <p className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
          Conversacion cerrada. Reabrela para responder.
        </p>
      ) : (
        <form action={replyToFamilyCommunication} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="communication_id" value={latest.id} />
          <input
            name="message"
            placeholder="Responder en esta conversacion"
            className="h-11 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
            <MessageSquareReply className="h-4 w-4" aria-hidden="true" />
            Responder
          </button>
        </form>
      )}

      {attendance ? (
        <form action={justifyAttendanceFromCommunication} className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <input type="hidden" name="attendance_id" value={attendance.id} />
          <input type="hidden" name="communication_id" value={latest.id} />
          <p className="text-sm font-semibold text-amber-800">
            Justificar {attendance.status === "absent" ? "falta" : "retraso"} del {attendance.date}
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              name="justification_text"
              placeholder="Motivo de la justificacion"
              className="h-10 flex-1 rounded-md border border-amber-200 bg-white px-3 text-sm outline-none"
            />
            <button className="h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
              Justificar
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function MessageBubble({ message }: { message: FamilyCommunication }) {
  const sent = message.direction === "sent";

  return (
    <div className={`flex ${sent ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-2xl rounded-lg border p-4 ${sent ? "border-primary/30 bg-primary/5" : "border-border bg-white"}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {sent ? <Send className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <Inbox className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
          <span className="font-semibold text-foreground">{sent ? "Tu mensaje" : message.senderName}</span>
          <span>{formatDate(message.created_at)}</span>
          <Badge>{message.read ? "Leido" : "Pendiente"}</Badge>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{message.message}</p>
      </div>
    </div>
  );
}

function Select({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-border px-2 py-1 text-xs font-medium capitalize">{children}</span>;
}

function buildFamilyConversations(communications: FamilyCommunication[]) {
  const groups = new Map<string, FamilyCommunication[]>();

  communications.forEach((communication) => {
    const key = [
      communication.student_id ?? "no-student",
      communication.counterpartId,
      normalizeSubject(communication.title),
      communication.category,
      communication.courseId ?? "no-course"
    ].join(":");

    groups.set(key, [...(groups.get(key) ?? []), communication]);
  });

  return Array.from(groups.entries())
    .map(([id, messages]): FamilyConversation => {
      const sortedDesc = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sortedDesc[0];

      return {
        id,
        subject: normalizeSubject(latest.title),
        messages: sortedDesc,
        latest,
        unreadCount: messages.filter((message) => message.direction === "received" && !message.read).length,
        isClosed: messages.length > 0 && messages.every((message) => message.status === "closed"),
        ids: messages.map((message) => message.id)
      };
    })
    .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
}

function filterFamilyConversations(conversations: FamilyConversation[], searchParams: PageProps["searchParams"]) {
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const conversationStatus = searchParams?.conversation_status;

  return conversations.filter((conversation) => {
    if (conversationStatus === "open" && conversation.isClosed) return false;
    if (conversationStatus === "closed" && !conversation.isClosed) return false;

    if (query) {
      const latest = conversation.latest;
      const haystack = [
        latest.counterpartName,
        conversation.subject,
        latest.studentName,
        latest.courseName,
        latest.message
      ].join(" ").toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

function normalizeSubject(value: string) {
  return value
    .replace(/^(\s*(re|fw|fwd)\s*:\s*)+/gi, "")
    .replace(/^\[Importante\]\s*/i, "")
    .trim() || "Sin asunto";
}

function hrefWith(searchParams: PageProps["searchParams"], updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/dashboard/family/communications?${query}` : "/dashboard/family/communications";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
