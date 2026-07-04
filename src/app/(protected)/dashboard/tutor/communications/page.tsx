import Link from "next/link";
import { Inbox, MessageSquareReply, Search, Send } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTutorCommunications, type TutorCommunication } from "@/lib/communications/notifications";
import { getActiveCourses } from "@/lib/courses";
import { getStudentsForTutor } from "@/lib/tutors/students";
import {
  closeTutorConversation,
  markTutorConversationRead,
  reopenTutorConversation,
  replyToTutorCommunication
} from "./actions";

type TutorCommunicationsPageProps = {
  searchParams?: {
    c?: string;
    q?: string;
    student_id?: string;
    family_id?: string;
    course_id?: string;
    category?: string;
    status?: string;
    conversation_status?: string;
    direction?: string;
  };
};

type TutorConversation = {
  id: string;
  subject: string;
  messages: TutorCommunication[];
  latest: TutorCommunication;
  unreadCount: number;
  isClosed: boolean;
  ids: string[];
};

export default async function TutorCommunicationsPage({ searchParams = {} }: TutorCommunicationsPageProps) {
  const profile = await requireRole("tutor");
  const [
    { communications, errorMessage },
    { students, errorMessage: studentsError },
    { courses, errorMessage: coursesError }
  ] = await Promise.all([
    getTutorCommunications(profile.id, {
      studentId: searchParams.student_id,
      familyId: searchParams.family_id,
      courseId: searchParams.course_id,
      category: searchParams.category,
      status: searchParams.status,
      direction: searchParams.direction
    }),
    getStudentsForTutor(profile.id),
    getActiveCourses()
  ]);
  const participants = Array.from(
    new Map(communications.map((communication) => [communication.counterpartId, communication.counterpartName])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], "es"));
  const sentCount = communications.filter((communication) => communication.direction === "sent").length;
  const receivedCount = communications.filter((communication) => communication.direction === "received").length;
  const unreadCount = communications.filter((communication) => !communication.read).length;
  const conversations = filterTutorConversations(buildTutorConversations(communications), searchParams);
  const selectedConversation = conversations.find((conversation) => conversation.id === searchParams.c) ?? null;
  const pageError = errorMessage ?? studentsError ?? coursesError;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Comunicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bandeja de mensajes enviados y recibidos con familias y direccion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/tutor/students"
            className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            + Nueva comunicacion
          </Link>
          <Link
            href="/dashboard/tutor"
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar las comunicaciones: {pageError}
        </div>
      ) : null}

      <SummaryChips sentCount={sentCount} receivedCount={receivedCount} unreadCount={unreadCount} />

      <form className="rounded-lg border border-border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-foreground">Buscar</span>
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Familia, alumno o asunto"
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <Select
            name="direction"
            label="Bandeja"
            value={searchParams.direction ?? ""}
            options={[
              { value: "sent", label: "Enviados" },
              { value: "received", label: "Recibidos" }
            ]}
          />
          <Select
            name="status"
            label="Estado"
            value={searchParams.status ?? ""}
            options={[
              { value: "unread", label: "No leidos" },
              { value: "read", label: "Leidos" }
            ]}
          />
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Filtrar
            </button>
            <Link
              href="/dashboard/tutor/communications"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
            >
              Limpiar
            </Link>
          </div>
        </div>
        <details className="mt-3 rounded-md border border-border bg-secondary/30 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Mas filtros</summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            <Select
              name="student_id"
              label="Alumno"
              value={searchParams.student_id ?? ""}
              options={students.map((student) => ({
                value: student.id,
                label: `${student.name} ${student.last_name}`
              }))}
            />
            <Select
              name="family_id"
              label="Familia / interlocutor"
              value={searchParams.family_id ?? ""}
              options={participants.map(([value, label]) => ({ value, label }))}
            />
            <Select
              name="course_id"
              label="Curso"
              value={searchParams.course_id ?? ""}
              options={courses.map((course) => ({ value: course.id, label: course.name }))}
            />
            <Select
              name="category"
              label="Categoria"
              value={searchParams.category ?? ""}
              options={[
                { value: "incidencia", label: "Incidencia" },
                { value: "acadÃ©mico", label: "Academico" },
                { value: "tutorÃ­a", label: "Tutoria" },
                { value: "general", label: "General" }
              ]}
            />
            <Select
              name="conversation_status"
              label="Conversacion"
              value={searchParams.conversation_status ?? ""}
              options={[
                { value: "open", label: "Abiertas" },
                { value: "closed", label: "Cerradas" }
              ]}
            />
          </div>
        </details>
      </form>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay comunicaciones con los filtros actuales.
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
          <ConversationDetail conversation={selectedConversation} />
        </section>
      )}
    </section>
  );
}

function ConversationListItem({
  conversation,
  active,
  searchParams
}: {
  conversation: TutorConversation;
  active: boolean;
  searchParams: TutorCommunicationsPageProps["searchParams"];
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
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge>{latest.category}</Badge>
        {latest.courseName !== "Sin curso" ? <Badge>{latest.courseName}</Badge> : null}
        {conversation.isClosed ? <Badge>Cerrada</Badge> : null}
        {conversation.unreadCount > 0 ? <span className="h-2 w-2 rounded-full bg-primary" aria-label="No leida" /> : null}
      </div>
    </Link>
  );
}

function ConversationDetail({ conversation }: { conversation: TutorConversation | null }) {
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
            <Badge>{conversation.isClosed ? "Cerrada" : "Abierta"}</Badge>
            {conversation.unreadCount > 0 ? <Badge>{`${conversation.unreadCount} sin leer`}</Badge> : null}
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
        <div className="flex flex-wrap gap-2">
          {unreadReceivedIds.length > 0 ? (
            <form action={markTutorConversationRead}>
              <input type="hidden" name="communication_ids" value={unreadReceivedIds.join(",")} />
              <button className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
                Marcar como leido
              </button>
            </form>
          ) : null}
          {conversation.isClosed ? (
            <form action={reopenTutorConversation}>
              <input type="hidden" name="communication_ids" value={conversation.ids.join(",")} />
              <button className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
                Reabrir
              </button>
            </form>
          ) : (
            <form action={closeTutorConversation}>
              <input type="hidden" name="communication_ids" value={conversation.ids.join(",")} />
              <button className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
                Cerrar
              </button>
            </form>
          )}
          {latest.student_id ? (
            <Link
              href={`/dashboard/tutor/students/${latest.student_id}`}
              className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
            >
              Abrir ficha
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-4 rounded-md bg-background p-4">
        {sortedMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {conversation.isClosed ? (
        <p className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
          Conversacion cerrada. Reabrela para responder.
        </p>
      ) : (
        <form action={replyToTutorCommunication} className="mt-4 flex flex-col gap-3 md:flex-row">
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
    </article>
  );
}

function MessageBubble({ message }: { message: TutorCommunication }) {
  const sent = message.direction === "sent";

  return (
    <div className={`flex ${sent ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-2xl rounded-2xl border px-4 py-3 shadow-sm ${sent ? "border-primary/25 bg-primary/5" : "border-border bg-white"}`}>
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

function SummaryChips({ sentCount, receivedCount, unreadCount }: { sentCount: number; receivedCount: number; unreadCount: number }) {
  return (
    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
      <span className="rounded-full border border-border bg-white px-3 py-1">Enviados: <strong className="text-foreground">{sentCount}</strong></span>
      <span className="rounded-full border border-border bg-white px-3 py-1">Recibidos: <strong className="text-foreground">{receivedCount}</strong></span>
      <span className="rounded-full border border-border bg-white px-3 py-1">No leidos: <strong className="text-foreground">{unreadCount}</strong></span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-border px-2 py-1 text-xs font-medium capitalize">{children}</span>;
}

function buildTutorConversations(communications: TutorCommunication[]) {
  const groups = new Map<string, TutorCommunication[]>();

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
    .map(([id, messages]): TutorConversation => {
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

function filterTutorConversations(conversations: TutorConversation[], searchParams: TutorCommunicationsPageProps["searchParams"]) {
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

function hrefWith(searchParams: TutorCommunicationsPageProps["searchParams"], updates: Record<string, string | undefined>) {
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
  return query ? `/dashboard/tutor/communications?${query}` : "/dashboard/tutor/communications";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
